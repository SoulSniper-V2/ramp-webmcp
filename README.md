# RAMP

A collaborative **design-token mixer**. A human and their AI agent share one live studio: the human drags hue and lightness, locks tokens, and inspects a live UI kit; the agent reads the palette, generates ramps, fixes contrast, applies moods, and exports tokens through **WebMCP** tools. Every agent action restyles the preview immediately.

RAMP is original work built during the [OpenAI WebMCP Challenge](https://learn.chatgpt.com/docs/webmcp) submission period (started 25 Aug 2026). Deadline: 3 Sep 2026, 1:00 PM PT.

This is not a chatbot overlay, form-filler, shop, guestbook, or restaurant clone. It is a precision instrument for mixing a token set together.

## Why WebMCP

Design tokens are a shared object. If the agent talks in chat while the human stares at a static page, they diverge. WebMCP registers tools on the **same page state** the UI is bound to, so `set_token`, `generate_ramp`, and `apply_mood` mutate the mixer the human is looking at. Locks are honored in-tool: the agent cannot silently overwrite a color the human pinned.

ChatGPT's built-in browser does **not** support declarative HTML tools or iframe-registered tools. RAMP registers imperative tools on the top-level page after client mount.

## How to run

Use Node.js 24 LTS (also supported: Node 22.12+ and 26+) and npm. `.nvmrc` selects
Node 24. Install the committed dependency versions:

```bash
npm ci --ignore-scripts
npm run dev
```

Then open the printed local URL (Vite defaults to `http://localhost:5173`).

Production build:

```bash
npm run build && npm run preview
```

Client-only. No backend, no auth. The mix persists in `localStorage` (`ramp.mix.v1`).
If browser storage is blocked, the mixer remains usable for the current session.

Validation:

```bash
npm test
npm run build
```

CI runs both commands on Node 22, 24, and 26. The Vitest suite covers shared undo
history, locked colors, storage access failures, and WebMCP registration/cleanup
with simulated host APIs. It does not replace testing with a real browser agent.

The build uses React 19, Vite 8, and TypeScript 7. Vite's build target explicitly
preserves the previous Vite 7 browser baseline for the human-only studio. See the
[Vite migration guide](https://vite.dev/guide/migration) and
[TypeScript 7 release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).

## Try a human and agent session

1. Open RAMP in a WebMCP-capable browser. Chrome offers an [origin trial and local testing flag](https://developer.chrome.com/docs/ai/webmcp); enable `chrome://flags/#enable-webmcp-testing` for local testing. Host and agent availability vary by browser release.
2. Confirm the banner reads **tools ready** and lists all ten registered tools. This confirms registration, not that an agent is connected.
3. Ask the agent to `get_palette`, then `apply_mood` to `solar`, then `generate_ramp` from a seed color. The preview and activity feed should update live.
4. Lock `accent` as the human. Ask the agent to `set_token` on `accent` — the tool must refuse and say so in the return value.
5. Check contrast failures (visually flagged in the meter) and `check_contrast`.
6. `annotate_preview` should drop a pin the human can see on the named region.
7. `export_tokens` should return contents **and** fill the export panel. Copy buttons work without WebMCP.
8. Without WebMCP (Safari, Chrome without WebMCP enabled) the human studio still works fully; the banner is informational, not blocking.

Configured response headers (dev, preview, and static hosts):

- `Origin-Agent-Cluster: ?1`
- `Permissions-Policy: tools=(self)`

Serve production over HTTPS. `Permissions-Policy: tools=(self)` permits tools
from the page's own origin; the headers do not enable an unsupported WebMCP API.
`Origin-Agent-Cluster: ?1` retains the challenge host configuration.

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
| `undo_last` | write | Revert the last token change; skip currently locked colors |

Feature detection uses `document.modelContext` first, then `navigator.modelContext`.
The [current WebMCP draft](https://webmachinelearning.github.io/webmcp/) uses async
registration and `AbortSignal` cleanup. Older navigator implementations are also
supported through synchronous registration and `unregisterTool()` when available.
Unmount and registration failure clean up the tools owned by that registration;
a partial failure is displayed in the banner. Tool callbacks return JSON-compatible
objects, including `ok: false` for validation failures.

Undo preserves current locks and their colors, reporting any skipped colors in
`skipped_locked`. Consecutive human drag updates share one undo step; agent actions
and other activity end that group. Undo history is session-only.

## Visual design

Dark studio chrome (graphite + brass fiducials + mint signal lamps) frames a preview bezel that **uses the mixed tokens**. The mixer pad is a 2-D OKLCH hue × lightness field. Not a generic purple dashboard.

## License

MIT. See `LICENSE`.
