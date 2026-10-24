import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { registerRampTools, TOOL_NAMES } from "../src/webmcp";

type Tool = { name: string; execute: (input: Record<string, unknown>) => Promise<unknown> };

function legacyContext(failAt?: string) {
  const tools = new Map<string, Tool>();
  return {
    tools,
    registerTool(tool: Tool) {
      if (tool.name === failAt || tools.has(tool.name)) throw new Error("Registration failed");
      tools.set(tool.name, tool);
    },
    unregisterTool(name: string) { tools.delete(name); },
  };
}

beforeEach(() => {
  vi.stubGlobal("document", {});
  vi.stubGlobal("navigator", {});
});
afterEach(() => vi.unstubAllGlobals());

it("cleans up legacy registrations before a StrictMode remount", async () => {
  const ctx = legacyContext();
  vi.stubGlobal("navigator", { modelContext: ctx });
  const first = new AbortController();
  const pending = registerRampTools(first.signal);
  first.abort();
  const second = new AbortController();
  const status = await registerRampTools(second.signal);
  await pending;
  expect(status.connected).toBe(true);
  expect([...ctx.tools.keys()]).toEqual(TOOL_NAMES);
  second.abort();
  expect(ctx.tools.size).toBe(0);
});

it("rolls back a partial registration and reports the error", async () => {
  const ctx = legacyContext("set_token");
  vi.stubGlobal("navigator", { modelContext: ctx });
  const status = await registerRampTools(new AbortController().signal);
  expect(status.connected).toBe(false);
  expect(status.tools).toEqual([]);
  expect(status.error).toContain("Registration failed");
  expect(ctx.tools.size).toBe(0);
});

it("does not register tools after unmount", async () => {
  const ctx = legacyContext();
  vi.stubGlobal("navigator", { modelContext: ctx });
  const controller = new AbortController();
  controller.abort();
  const status = await registerRampTools(controller.signal);
  expect(status.connected).toBe(false);
  expect(ctx.tools.size).toBe(0);
});

it("retains the signal-based document API and returns palette results", async () => {
  const tools = new Map<string, Tool>();
  vi.stubGlobal("document", { modelContext: {
    async registerTool(tool: Tool, { signal }: { signal: AbortSignal }) {
      tools.set(tool.name, tool);
      signal.addEventListener("abort", () => tools.delete(tool.name), { once: true });
    },
  } });
  const controller = new AbortController();
  expect(await registerRampTools(controller.signal)).toMatchObject({ connected: true, source: "document.modelContext" });
  expect(await tools.get("get_palette")!.execute({})).toHaveProperty("tokens.accent");
  controller.abort();
  expect(tools.size).toBe(0);
});

it("tries navigator when document modelContext access is blocked", async () => {
  const ctx = legacyContext();
  vi.stubGlobal("document", { get modelContext() { throw new Error("Unavailable"); } });
  vi.stubGlobal("navigator", { modelContext: ctx });
  const controller = new AbortController();
  expect(await registerRampTools(controller.signal)).toMatchObject({ connected: true, source: "navigator.modelContext" });
  controller.abort();
});

it("rolls back a rejected async document registration", async () => {
  const tools = new Map<string, Tool>();
  vi.stubGlobal("document", { modelContext: {
    async registerTool(tool: Tool, { signal }: { signal: AbortSignal }) {
      if (tool.name === "set_token") throw new Error("Permission denied");
      tools.set(tool.name, tool);
      signal.addEventListener("abort", () => tools.delete(tool.name), { once: true });
    },
  } });
  const status = await registerRampTools(new AbortController().signal);
  expect(status).toMatchObject({ connected: false, tools: [], error: "Permission denied" });
  expect(tools.size).toBe(0);
});

it("does not remove another registration when a name is already taken", async () => {
  const ctx = legacyContext();
  const existing: Tool = { name: "set_token", execute: async () => ({}) };
  ctx.tools.set(existing.name, existing);
  vi.stubGlobal("navigator", { modelContext: ctx });
  expect(await registerRampTools(new AbortController().signal)).toMatchObject({ connected: false });
  expect([...ctx.tools.values()]).toEqual([existing]);
});

it("does not register the remaining document tools when aborted during an await", async () => {
  const tools = new Map<string, Tool>();
  let finish!: () => void;
  vi.stubGlobal("document", { modelContext: {
    registerTool(tool: Tool, { signal }: { signal: AbortSignal }) {
      tools.set(tool.name, tool);
      signal.addEventListener("abort", () => tools.delete(tool.name), { once: true });
      return new Promise<void>((resolve) => { finish = resolve; });
    },
  } });
  const controller = new AbortController();
  const pending = registerRampTools(controller.signal);
  controller.abort();
  finish();
  expect(await pending).toMatchObject({ connected: false, tools: [] });
  expect(tools.size).toBe(0);
});
