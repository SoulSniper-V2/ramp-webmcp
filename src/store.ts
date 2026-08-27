import { useSyncExternalStore } from "react";
import { contrastReport, parseColor, rampFromSeed, rampFromTo } from "./color";
import { DEFAULT_MOOD, PRESETS } from "./presets";
import type {
  Actor,
  Annotation,
  ContrastPairReport,
  MixSnapshot,
  MixState,
  Mood,
  TokenName,
  Tokens,
} from "./types";
import {
  CORE_TOKENS,
  PREVIEW_REGIONS,
  RAMP_STOPS,
  TOKEN_NAMES,
  emptyLocks,
  isPreviewRegion,
  isTokenName,
} from "./types";

const STORAGE_KEY = "ramp.mix.v1";
const MAX_ACTIVITY = 20;
const MAX_HISTORY = 40;

const listeners = new Set<() => void>();

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneTokens(tokens: Tokens): Tokens {
  return { ...tokens };
}

function cloneLocks(locks: Record<TokenName, boolean>): Record<TokenName, boolean> {
  return { ...locks };
}

function contrastPairs(tokens: Tokens): ContrastPairReport[] {
  const pairs: [TokenName, TokenName][] = [
    ["text", "bg"],
    ["accent-text", "accent"],
    ["muted", "bg"],
  ];
  return pairs.map(([fg, bg]) => {
    const report = contrastReport(tokens[fg], tokens[bg]);
    return { pair: [fg, bg], ...report };
  });
}

function contrastFailures(tokens: Tokens): ContrastPairReport[] {
  return contrastPairs(tokens).filter((p) => !p.aa.text);
}

function loadPersisted(): { tokens: Tokens; locks: Record<TokenName, boolean> } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      tokens?: Partial<Tokens>;
      locks?: Partial<Record<TokenName, boolean>>;
    };
    if (!parsed.tokens || typeof parsed.tokens !== "object") return null;
    const base = cloneTokens(PRESETS[DEFAULT_MOOD]);
    const locks = emptyLocks();
    for (const name of TOKEN_NAMES) {
      const v = parsed.tokens[name];
      if (typeof v === "string") {
        const parsedColor = parseColor(v);
        if (parsedColor) base[name] = parsedColor.hex;
      }
      if (parsed.locks && typeof parsed.locks[name] === "boolean") {
        locks[name] = parsed.locks[name] as boolean;
      }
    }
    return { tokens: base, locks };
  } catch {
    return null;
  }
}

function persist(state: MixState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tokens: state.tokens, locks: state.locks }),
    );
  } catch {
    /* quota / private mode */
  }
}

const restored = typeof localStorage !== "undefined" ? loadPersisted() : null;

let state: MixState = {
  tokens: restored?.tokens ?? cloneTokens(PRESETS[DEFAULT_MOOD]),
  locks: restored?.locks ?? emptyLocks(),
  history: [],
  activity: restored
    ? [
        {
          id: uid(),
          ts: Date.now(),
          actor: "human",
          kind: "restore",
          message: "Restored mix from this browser",
        },
      ]
    : [
        {
          id: uid(),
          ts: Date.now(),
          actor: "human",
          kind: "boot",
          message: "Loaded Midnight palette",
        },
      ],
  annotations: [],
  exportPanel: null,
};

function emit(): void {
  persist(state);
  for (const l of listeners) l();
}

function pushActivity(actor: Actor, kind: string, message: string): void {
  const event = { id: uid(), ts: Date.now(), actor, kind, message };
  state = {
    ...state,
    activity: [event, ...state.activity].slice(0, MAX_ACTIVITY),
  };
}

function snapshot(): MixSnapshot {
  return { tokens: cloneTokens(state.tokens), locks: cloneLocks(state.locks) };
}

function pushHistory(): void {
  state = {
    ...state,
    history: [...state.history, snapshot()].slice(-MAX_HISTORY),
  };
}

let lastHumanEdit: { token: TokenName; ts: number } | null = null;

export function getState(): MixState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMix(): MixState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function palettePayload() {
  const tokens = state.tokens;
  const oklch: Record<string, string> = {};
  const hex: Record<string, string> = {};
  for (const name of TOKEN_NAMES) {
    hex[name] = tokens[name];
    const parsed = parseColor(tokens[name]);
    oklch[name] = parsed
      ? `oklch(${parsed.oklch.l.toFixed(3)} ${parsed.oklch.c.toFixed(3)} ${parsed.oklch.h.toFixed(1)})`
      : tokens[name];
  }
  const locked = TOKEN_NAMES.filter((n) => state.locks[n]);
  const pairs = contrastPairs(tokens);
  const failures = pairs.filter((p) => !p.aa.text);
  return {
    tokens: hex,
    oklch,
    locked,
    contrast: pairs.map((p) => ({
      pair: p.pair,
      ratio: p.ratio,
      aa_text: p.aa.text,
      aa_large: p.aa.large,
      aaa_text: p.aaa.text,
      aaa_large: p.aaa.large,
    })),
    failures: failures.map((p) => ({
      pair: p.pair,
      ratio: p.ratio,
      need: "4.5:1 AA text",
    })),
  };
}

export function cssExport(tokens: Tokens): string {
  const lines = TOKEN_NAMES.map((n) => `  --${n}: ${tokens[n]};`);
  return `:root {\n${lines.join("\n")}\n}\n`;
}

export function jsonExport(tokens: Tokens): string {
  const body: Record<string, string> = {};
  for (const n of TOKEN_NAMES) body[n] = tokens[n];
  return JSON.stringify({ name: "ramp-mix", tokens: body }, null, 2);
}

export type ToolResult = Record<string, unknown>;

export function setToken(
  token: string,
  value: string,
  actor: Actor,
): ToolResult {
  if (!isTokenName(token)) {
    return {
      ok: false,
      error: `Unknown token "${token}". Valid: ${TOKEN_NAMES.join(", ")}`,
    };
  }
  if (state.locks[token]) {
    return {
      ok: false,
      error: `Token "${token}" is locked by the human. Unlock it before changing.`,
      locked: true,
      token,
    };
  }
  const parsed = parseColor(value);
  if (!parsed) {
    return {
      ok: false,
      error:
        'Invalid color. Pass hex (#rrggbb or #rgb) or oklch(L C H), e.g. "#3ee0c2" or "oklch(0.78 0.12 175)". Arbitrary CSS is rejected.',
    };
  }
  const coalesce =
    actor === "human" &&
    lastHumanEdit !== null &&
    lastHumanEdit.token === token &&
    Date.now() - lastHumanEdit.ts < 700;
  if (!coalesce) pushHistory();
  if (actor === "human") lastHumanEdit = { token, ts: Date.now() };
  const next = cloneTokens(state.tokens);
  next[token] = parsed.hex;
  state = { ...state, tokens: next };
  if (coalesce && state.activity[0]?.kind === "set_token") {
    const [head, ...rest] = state.activity;
    state = {
      ...state,
      activity: [{ ...head, ts: Date.now(), message: `${token} → ${parsed.hex}` }, ...rest],
    };
  } else {
    pushActivity(actor, "set_token", `${token} → ${parsed.hex}`);
  }
  emit();
  return {
    ok: true,
    token,
    value: parsed.hex,
    oklch: `oklch(${parsed.oklch.l.toFixed(3)} ${parsed.oklch.c.toFixed(3)} ${parsed.oklch.h.toFixed(1)})`,
    failures: contrastFailures(state.tokens).map((p) => ({
      pair: p.pair,
      ratio: p.ratio,
    })),
  };
}

export function generateRamp(
  from: string,
  to: string | undefined,
  _stops: number | undefined,
  actor: Actor,
): ToolResult {
  const seed = parseColor(from);
  if (!seed) {
    return {
      ok: false,
      error: 'Invalid "from" color. Use hex or oklch.',
    };
  }
  let hexes: string[];
  if (to) {
    const end = parseColor(to);
    if (!end) {
      return { ok: false, error: 'Invalid "to" color. Use hex or oklch.' };
    }
    hexes = rampFromTo(seed.oklch, end.oklch, RAMP_STOPS.length);
  } else {
    hexes = rampFromSeed(seed.oklch, RAMP_STOPS.length);
  }

  const skipped: TokenName[] = [];
  const updated: TokenName[] = [];
  pushHistory();
  const next = cloneTokens(state.tokens);
  RAMP_STOPS.forEach((stop, i) => {
    if (state.locks[stop]) {
      skipped.push(stop);
      return;
    }
    next[stop] = hexes[i];
    updated.push(stop);
  });
  if (!state.locks.accent && updated.includes("accent-400")) {
    next.accent = next["accent-400"];
    updated.push("accent");
  }
  state = { ...state, tokens: next };
  pushActivity(
    actor,
    "generate_ramp",
    `Ramp rebuilt (${updated.length} stops)${skipped.length ? `, skipped locked: ${skipped.join(", ")}` : ""}`,
  );
  emit();
  return {
    ok: true,
    updated,
    skipped_locked: skipped,
    ramp: Object.fromEntries(RAMP_STOPS.map((s) => [s, state.tokens[s]])),
    accent: state.tokens.accent,
    failures: contrastFailures(state.tokens).map((p) => ({
      pair: p.pair,
      ratio: p.ratio,
    })),
  };
}

export function checkContrastTool(
  foreground: string,
  background: string,
): ToolResult {
  const resolve = (input: string): { hex: string; label: string } | null => {
    if (isTokenName(input)) {
      return { hex: state.tokens[input], label: input };
    }
    const parsed = parseColor(input);
    if (!parsed) return null;
    return { hex: parsed.hex, label: parsed.hex };
  };
  const fg = resolve(foreground);
  const bg = resolve(background);
  if (!fg || !bg) {
    return {
      ok: false,
      error:
        "foreground and background must be token names or hex/oklch colors.",
    };
  }
  const report = contrastReport(fg.hex, bg.hex);
  return {
    ok: true,
    foreground: { token_or_color: fg.label, hex: fg.hex },
    background: { token_or_color: bg.label, hex: bg.hex },
    ratio: report.ratio,
    aa: report.aa,
    aaa: report.aaa,
    pass_text_aa: report.aa.text,
    pass_text_aaa: report.aaa.text,
    pass_large_aa: report.aa.large,
    pass_large_aaa: report.aaa.large,
  };
}

export function applyMood(mood: Mood, actor: Actor): ToolResult {
  const preset = PRESETS[mood];
  const skipped: TokenName[] = [];
  const updated: TokenName[] = [];
  pushHistory();
  const next = cloneTokens(state.tokens);
  for (const name of TOKEN_NAMES) {
    if (state.locks[name]) {
      skipped.push(name);
      continue;
    }
    next[name] = preset[name];
    updated.push(name);
  }
  state = { ...state, tokens: next };
  pushActivity(
    actor,
    "apply_mood",
    `Applied ${mood}${skipped.length ? ` (skipped locked: ${skipped.join(", ")})` : ""}`,
  );
  emit();
  return {
    ok: true,
    mood,
    updated,
    skipped_locked: skipped,
    failures: contrastFailures(state.tokens).map((p) => ({
      pair: p.pair,
      ratio: p.ratio,
    })),
  };
}

export function lockToken(token: string, actor: Actor): ToolResult {
  if (!isTokenName(token)) {
    return { ok: false, error: `Unknown token "${token}".` };
  }
  if (state.locks[token]) {
    return { ok: true, token, locked: true, note: "Already locked." };
  }
  const locks = cloneLocks(state.locks);
  locks[token] = true;
  state = { ...state, locks };
  pushActivity(actor, "lock", `Locked ${token}`);
  emit();
  return { ok: true, token, locked: true };
}

export function unlockToken(token: string, actor: Actor): ToolResult {
  if (!isTokenName(token)) {
    return { ok: false, error: `Unknown token "${token}".` };
  }
  if (!state.locks[token]) {
    return { ok: true, token, locked: false, note: "Already unlocked." };
  }
  const locks = cloneLocks(state.locks);
  locks[token] = false;
  state = { ...state, locks };
  pushActivity(actor, "unlock", `Unlocked ${token}`);
  emit();
  return { ok: true, token, locked: false };
}

export function toggleLock(token: TokenName, actor: Actor): void {
  if (state.locks[token]) unlockToken(token, actor);
  else lockToken(token, actor);
}

export function annotatePreview(
  region: string,
  note: string,
  actor: Actor,
): ToolResult {
  if (!isPreviewRegion(region)) {
    return {
      ok: false,
      error: `Unknown region "${region}". Valid: ${PREVIEW_REGIONS.join(", ")}`,
    };
  }
  const trimmed = String(note ?? "").trim().slice(0, 280);
  if (!trimmed) {
    return { ok: false, error: "note must be a non-empty string (max 280)." };
  }
  const annotation: Annotation = { id: uid(), region, note: trimmed };
  const rest = state.annotations.filter((a) => a.region !== region);
  state = { ...state, annotations: [...rest, annotation] };
  pushActivity(actor, "annotate", `Pin on ${region}: ${trimmed}`);
  emit();
  return { ok: true, region, note: trimmed, id: annotation.id };
}

export function dismissAnnotation(id: string): void {
  state = {
    ...state,
    annotations: state.annotations.filter((a) => a.id !== id),
  };
  emit();
}

export function exportTokens(format: "css" | "json", actor: Actor): ToolResult {
  const contents = format === "css" ? cssExport(state.tokens) : jsonExport(state.tokens);
  state = { ...state, exportPanel: { format, contents } };
  pushActivity(actor, "export", `Exported ${format.toUpperCase()}`);
  emit();
  return { ok: true, format, contents };
}

export function undoLast(actor: Actor): ToolResult {
  if (state.history.length === 0) {
    return { ok: false, error: "Nothing to undo." };
  }
  const prev = state.history[state.history.length - 1];
  state = {
    ...state,
    history: state.history.slice(0, -1),
    tokens: cloneTokens(prev.tokens),
  };
  pushActivity(actor, "undo", "Reverted last token change");
  emit();
  return {
    ok: true,
    tokens: state.tokens,
    failures: contrastFailures(state.tokens).map((p) => ({
      pair: p.pair,
      ratio: p.ratio,
    })),
  };
}

export function keyPairs(): ContrastPairReport[] {
  return contrastPairs(state.tokens);
}

export { CORE_TOKENS, RAMP_STOPS, TOKEN_NAMES };
