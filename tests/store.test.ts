import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("undo preserves currently locked colors and restores other changed tokens", async () => {
  const store = await import("../src/store");
  const initial = { ...store.getState().tokens };
  store.applyMood("solar", "agent");
  const pinned = store.getState().tokens.accent;
  store.lockToken("accent", "human");
  expect(store.undoLast("agent")).toMatchObject({ ok: true, skipped_locked: ["accent"] });
  expect(store.getState().tokens.accent).toBe(pinned);
  expect(store.getState().tokens.bg).toBe(initial.bg);
  expect(store.getState().locks.accent).toBe(true);
});

it("keeps human edits on either side of an agent edit separate in history and activity", async () => {
  const store = await import("../src/store");
  store.setToken("accent", "#111111", "human");
  store.setToken("accent", "#222222", "agent");
  store.setToken("accent", "#333333", "human");
  expect(store.getState().activity[0]).toMatchObject({ actor: "human", message: "accent → #333333" });
  store.undoLast("human");
  expect(store.getState().tokens.accent).toBe("#222222");
  store.undoLast("human");
  expect(store.getState().tokens.accent).toBe("#111111");
});

it("starts a new history entry when editing immediately after undo", async () => {
  const store = await import("../src/store");
  const initial = store.getState().tokens.accent;
  store.setToken("accent", "#111111", "human");
  store.undoLast("human");
  store.setToken("accent", "#222222", "human");
  expect(store.undoLast("human")).toMatchObject({ ok: true });
  expect(store.getState().tokens.accent).toBe(initial);
});

it("still groups consecutive human drag updates into one undo", async () => {
  const store = await import("../src/store");
  const initial = store.getState().tokens.accent;
  store.setToken("accent", "#111111", "human");
  store.setToken("accent", "#222222", "human");
  expect(store.getState().history).toHaveLength(1);
  store.undoLast("human");
  expect(store.getState().tokens.accent).toBe(initial);
});

it("keeps the mixer usable when access to localStorage throws", async () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new DOMException("Storage is blocked", "SecurityError"); },
  });
  const store = await import("../src/store");
  expect(store.setToken("accent", "#123456", "human")).toMatchObject({ ok: true });
});

it("keeps locked stops during ramp generation and exports the current palette", async () => {
  const store = await import("../src/store");
  const initial = store.getState().tokens["accent-500"];
  store.lockToken("accent-500", "human");
  expect(store.generateRamp("#123456", undefined, undefined, "agent")).toMatchObject({
    ok: true, skipped_locked: ["accent-500"],
  });
  expect(store.getState().tokens["accent-500"]).toBe(initial);
  expect(store.setToken("accent-500", "#ffffff", "agent")).toMatchObject({ ok: false, locked: true });
  const result = store.exportTokens("json", "agent");
  expect(JSON.parse(result.contents as string).tokens).toEqual(store.getState().tokens);
  expect(store.getState().exportPanel?.contents).toBe(result.contents);
});
