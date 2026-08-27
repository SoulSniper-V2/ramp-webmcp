import {
  annotatePreview,
  applyMood,
  checkContrastTool,
  exportTokens,
  generateRamp,
  lockToken,
  palettePayload,
  setToken,
  undoLast,
  unlockToken,
} from "./store";
import { isMood } from "./types";

export type WebMcpStatus = {
  available: boolean;
  connected: boolean;
  tools: string[];
  source: "document.modelContext" | "navigator.modelContext" | "none";
};

function getModelContext(): {
  ctx: ModelContext;
  source: "document.modelContext" | "navigator.modelContext";
} | null {
  try {
    const fromDocument = document.modelContext;
    if (typeof fromDocument?.registerTool === "function") {
      return { ctx: fromDocument, source: "document.modelContext" };
    }
    const fromNavigator = navigator.modelContext;
    if (typeof fromNavigator?.registerTool === "function") {
      return { ctx: fromNavigator, source: "navigator.modelContext" };
    }
  } catch {
    /* Safari / unsupported */
  }
  return null;
}

function str(input: Record<string, unknown>, key: string): string {
  const v = input[key];
  return typeof v === "string" ? v : "";
}

function num(input: Record<string, unknown>, key: string): number | undefined {
  const v = input[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

const TOOLS: Omit<ModelContextTool, "execute">[] = [
  {
    name: "get_palette",
    description:
      "Read the current RAMP design-token palette. Returns hex and oklch for every token (bg, surface, text, muted, accent, accent-text, border, danger, accent-100..accent-900), which tokens the human has locked, WCAG contrast ratios for text/bg, accent-text/accent, muted/bg, and any AA failures. Call this before proposing color changes.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "set_token",
    description:
      "Set one unlocked design token to a hex (#rrggbb or #rgb) or oklch(L C H) color. Valid tokens: bg, surface, text, muted, accent, accent-text, border, danger, accent-100 through accent-900. Fails clearly if the token is locked by the human — do not retry a locked token; ask the human to unlock it. Arbitrary CSS is rejected. Returns the new value and any contrast failures.",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "Token name, e.g. accent, text, accent-500",
        },
        value: {
          type: "string",
          description: 'Hex or oklch, e.g. "#3ee0c2" or "oklch(0.78 0.12 175)"',
        },
      },
      required: ["token", "value"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "generate_ramp",
    description:
      "Rebuild the 9-stop accent ramp (accent-100 light through accent-900 dark) in OKLCH. Pass a seed color as from; optionally pass to to interpolate between two colors. Locked ramp stops are skipped and listed in skipped_locked. Also updates the accent token to accent-400 if accent is unlocked. Use after get_palette.",
    inputSchema: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Hex or oklch seed (or light end if to is set)",
        },
        to: {
          type: "string",
          description: "Optional hex or oklch dark end",
        },
        stops: {
          type: "integer",
          description: "Optional; ramp is always 9 named stops (100-900)",
          minimum: 3,
          maximum: 12,
        },
      },
      required: ["from"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "check_contrast",
    description:
      "Compute WCAG 2 contrast ratio for a pair of tokens or raw hex/oklch colors. Returns ratio plus AA/AAA pass/fail for normal text (4.5 / 7) and large text (3 / 4.5). Example: foreground=text, background=bg.",
    inputSchema: {
      type: "object",
      properties: {
        foreground: {
          type: "string",
          description: "Token name or hex/oklch color",
        },
        background: {
          type: "string",
          description: "Token name or hex/oklch color",
        },
      },
      required: ["foreground", "background"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "apply_mood",
    description:
      "Apply a named mood preset to unlocked tokens. Moods: paper (warm off-white, terracotta), midnight (deep navy, teal — default), terminal (phosphor green on black), solar (sunlit cream and amber). Locked tokens are skipped. Returns skipped_locked and any contrast failures.",
    inputSchema: {
      type: "object",
      properties: {
        mood: {
          type: "string",
          enum: ["paper", "midnight", "terminal", "solar"],
          description: "Preset name",
        },
      },
      required: ["mood"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "lock_token",
    description:
      "Lock a token so set_token, generate_ramp, and apply_mood will refuse to change it. The human can also lock from the UI. Use when the human wants a color held.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string", description: "Token name to lock" },
      },
      required: ["token"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "unlock_token",
    description:
      "Unlock a token so it can be changed again by the human or by agent tools.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string", description: "Token name to unlock" },
      },
      required: ["token"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "annotate_preview",
    description:
      "Drop a visible pin on a live UI-kit region so the human can see your note. Regions: nav, buttons, form, card, table, stat, alert. Replaces any existing pin on that region. Keep notes short and specific (max 280 chars).",
    inputSchema: {
      type: "object",
      properties: {
        region: {
          type: "string",
          enum: ["nav", "buttons", "form", "card", "table", "stat", "alert"],
        },
        note: { type: "string", description: "Note the human will see" },
      },
      required: ["region", "note"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "export_tokens",
    description:
      "Export the current token set as CSS custom properties or JSON. Returns the file contents AND populates the export panel in the studio so the human can copy them.",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["css", "json"] },
      },
      required: ["format"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "undo_last",
    description:
      "Revert the last token change (set_token, generate_ramp, or apply_mood). Locks are preserved. Returns the restored palette and any contrast failures. No-op with an error if history is empty.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
];

type Exec = (
  input: Record<string, unknown>,
  extras: { signal: AbortSignal },
) => Promise<Record<string, unknown>> | Record<string, unknown>;

const EXECUTORS: Record<string, Exec> = {
  get_palette: () => palettePayload(),
  set_token: (input) => setToken(str(input, "token"), str(input, "value"), "agent"),
  generate_ramp: (input) =>
    generateRamp(str(input, "from"), str(input, "to") || undefined, num(input, "stops"), "agent"),
  check_contrast: (input) =>
    checkContrastTool(str(input, "foreground"), str(input, "background")),
  apply_mood: (input) => {
    const mood = str(input, "mood").toLowerCase();
    if (!isMood(mood)) {
      return { ok: false, error: 'mood must be one of: paper, midnight, terminal, solar' };
    }
    return applyMood(mood, "agent");
  },
  lock_token: (input) => lockToken(str(input, "token"), "agent"),
  unlock_token: (input) => unlockToken(str(input, "token"), "agent"),
  annotate_preview: (input) =>
    annotatePreview(str(input, "region"), str(input, "note"), "agent"),
  export_tokens: (input) => {
    const format = str(input, "format");
    if (format !== "css" && format !== "json") {
      return { ok: false, error: 'format must be "css" or "json"' };
    }
    return exportTokens(format, "agent");
  },
  undo_last: () => undoLast("agent"),
};

export function detectWebMcp(): WebMcpStatus {
  const found = getModelContext();
  if (!found) {
    return { available: false, connected: false, tools: [], source: "none" };
  }
  return {
    available: true,
    connected: false,
    tools: [],
    source: found.source,
  };
}

export async function registerRampTools(
  signal: AbortSignal,
): Promise<WebMcpStatus> {
  const found = getModelContext();
  if (!found) {
    return { available: false, connected: false, tools: [], source: "none" };
  }
  const names: string[] = [];
  try {
    for (const spec of TOOLS) {
      if (signal.aborted) break;
      const execute = EXECUTORS[spec.name];
      await found.ctx.registerTool(
        {
          ...spec,
          execute: async (input, extras) => {
            const result = await execute(input ?? {}, extras);
            return result;
          },
        },
        { signal },
      );
      names.push(spec.name);
    }
  } catch {
    return {
      available: true,
      connected: names.length > 0,
      tools: names,
      source: found.source,
    };
  }
  return {
    available: true,
    connected: names.length > 0,
    tools: names,
    source: found.source,
  };
}

export const TOOL_NAMES = TOOLS.map((t) => t.name);
