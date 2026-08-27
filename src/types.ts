export const CORE_TOKENS = [
  "bg",
  "surface",
  "text",
  "muted",
  "accent",
  "accent-text",
  "border",
  "danger",
] as const;

export const RAMP_STOPS = [
  "accent-100",
  "accent-200",
  "accent-300",
  "accent-400",
  "accent-500",
  "accent-600",
  "accent-700",
  "accent-800",
  "accent-900",
] as const;

export const TOKEN_NAMES = [...CORE_TOKENS, ...RAMP_STOPS] as const;

export type CoreToken = (typeof CORE_TOKENS)[number];
export type RampStop = (typeof RAMP_STOPS)[number];
export type TokenName = (typeof TOKEN_NAMES)[number];

export type Tokens = Record<TokenName, string>;

export type Mood = "paper" | "midnight" | "terminal" | "solar";

export const MOODS: Mood[] = ["paper", "midnight", "terminal", "solar"];

export type Actor = "human" | "agent";

export type PreviewRegion =
  | "nav"
  | "buttons"
  | "form"
  | "card"
  | "table"
  | "stat"
  | "alert";

export const PREVIEW_REGIONS: PreviewRegion[] = [
  "nav",
  "buttons",
  "form",
  "card",
  "table",
  "stat",
  "alert",
];

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  aa: { text: boolean; large: boolean };
  aaa: { text: boolean; large: boolean };
}

export interface ContrastPairReport extends ContrastResult {
  pair: [string, string];
}

export interface ActivityEvent {
  id: string;
  ts: number;
  actor: Actor;
  kind: string;
  message: string;
}

export interface Annotation {
  id: string;
  region: PreviewRegion;
  note: string;
}

export interface MixSnapshot {
  tokens: Tokens;
  locks: Record<TokenName, boolean>;
}

export interface MixState {
  tokens: Tokens;
  locks: Record<TokenName, boolean>;
  history: MixSnapshot[];
  activity: ActivityEvent[];
  annotations: Annotation[];
  exportPanel: { format: "css" | "json"; contents: string } | null;
}

export function isTokenName(value: string): value is TokenName {
  return (TOKEN_NAMES as readonly string[]).includes(value);
}

export function isMood(value: string): value is Mood {
  return (MOODS as readonly string[]).includes(value);
}

export function isPreviewRegion(value: string): value is PreviewRegion {
  return (PREVIEW_REGIONS as readonly string[]).includes(value);
}

export function emptyLocks(): Record<TokenName, boolean> {
  const locks = {} as Record<TokenName, boolean>;
  for (const name of TOKEN_NAMES) locks[name] = false;
  return locks;
}
