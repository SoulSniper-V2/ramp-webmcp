# RAMP

A collaborative **design-token mixer**. A human and their AI agent share one live studio: the human drags hue and lightness, locks tokens, and inspects a live UI kit; the agent reads the palette, generates ramps, fixes contrast, applies moods, and exports tokens through **WebMCP** tools. Every agent action restyles the preview immediately.

RAMP is original work built during the [OpenAI WebMCP Challenge](https://learn.chatgpt.com/docs/webmcp) submission period (started 25 Aug 2026). Deadline: 3 Sep 2026, 1:00 PM PT.

This is not a chatbot overlay, form-filler, shop, guestbook, or restaurant clone. It is a precision instrument for mixing a token set together.

## Why WebMCP

Design tokens are a shared object. If the agent talks in chat while the human stares at a static page, they diverge. WebMCP registers tools on the **same page state** the UI is bound to, so `set_token`, `generate_ramp`, and `apply_mood` mutate the mixer the human is looking at. Locks are honored in-tool: the agent cannot silently overwrite a color the human pinned.

ChatGPT's built-in browser does **not** support declarative HTML tools or iframe-registered tools. RAMP registers imperative tools on the top-level page after client mount.

## How to run

```bash
npm i && npm run dev
```

Then open the printed local URL (Vite defaults to `http://localhost:5173`).

Production build:

```bash
npm run build && npm run preview
```

Client-only. No backend, no auth. The mix persists in `localStorage` (`ramp.mix.v1`).

## How judges test

1. Open RAMP in **ChatGPT desktop's in-app browser** (GPT-5.6 Sol or Terra; Work or Codex) **or** Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled.
2. Confirm the banner reads **agent connected** and lists the registered tools.
3. Ask the agent to `get_palette`, then `apply_mood` to `solar`, then `generate_ramp` from a seed color. The preview and activity feed should update live.
4. Lock `accent` as the human. Ask the agent to `set_token` on `accent` — the tool must refuse and say so in the return value.
5. Check contrast failures (visually flagged in the meter) and `check_contrast`.
6. `annotate_preview` should drop a pin the human can see on the named region.
7. `export_tokens` should return contents **and** fill the export panel. Copy buttons work without WebMCP.
8. Without WebMCP (Safari, unflagged Chrome) the human studio still works fully; the banner is informational, not blocking.

Required response headers (dev, preview, and static hosts):

- `Origin-Agent-Cluster: ?1`
- `Permissions-Policy: tools=(self)`

Never `Origin-Agent-Cluster: ?0`. Serve production over HTTPS.

## Token set

`bg`, `surface`, `text`, `muted`, `accent`, `accent-text`, `border`, `danger`, plus a 9-stop accent ramp (`accent-100` … `accent-900`).

Mood presets: **Paper**, **Midnight** (default), **Terminal**, **Solar**. Presets skip locked tokens.

## WebMCP tools

| Tool | Side effect | What it does |
| --- | --- | --- |
| `get_palette` | read | Current tokens, locks, contrast report |
| `set_token` | write | Set one unlocked token (hex or oklch) |
| `generate_ramp` | write | Rebuild the 9-stop accent ramp; skip locked stops |
| `check_contrast` | read | Ratio + AA/AAA for text and large text |
| `apply_mood` | write | Apply a named preset; skip locks |
| `lock_token` | write | Lock a token against agent (and UI) edits |
| `unlock_token` | write | Unlock a token |
| `annotate_preview` | write | Pin a note on a preview region |
| `export_tokens` | write | Return CSS or JSON **and** populate the export panel |
| `undo_last` | write | Revert the last token change |

Feature detection uses `document.modelContext` first, then `navigator.modelContext`. Tools are registered with `AbortSignal`; abort on unmount. There is no `unregisterTool()` call.

## Visual design

Dark studio chrome (graphite + brass fiducials + mint signal lamps) frames a preview bezel that **uses the mixed tokens**. The mixer pad is a 2-D OKLCH hue × lightness field. Not a generic purple dashboard.

## License

MIT. See `LICENSE`.
