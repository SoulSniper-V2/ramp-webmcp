import { useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "./components/ActivityFeed";
import { ContrastMeter } from "./components/ContrastMeter";
import { ExportDock } from "./components/ExportDock";
import { MoodStrip } from "./components/MoodStrip";
import { PreviewKit } from "./components/PreviewKit";
import { TokenRail } from "./components/TokenRail";
import { WebMcpBanner } from "./components/WebMcpBanner";
import { contrastReport } from "./color";
import {
  dismissAnnotation,
  setToken,
  toggleLock,
  undoLast,
  useMix,
} from "./store";
import type { TokenName } from "./types";
import { detectWebMcp, registerRampTools, type WebMcpStatus } from "./webmcp";

const FIDUCIALS = ["#d8fff6", "#6eebcf", "#3ee0c2", "#1fc4a8", "#0f7a6b"];

export default function App() {
  const mix = useMix();
  const [selected, setSelected] = useState<TokenName>("accent");
  const [webmcp, setWebmcp] = useState<WebMcpStatus>(() => detectWebMcp());

  useEffect(() => {
    const ac = new AbortController();
    void registerRampTools(ac.signal).then(setWebmcp);
    return () => ac.abort();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undoLast("human");
        return;
      }
      if (typing) return;
      if (e.key === "z" || e.key === "Z") {
        undoLast("human");
      } else if (e.key === "l" || e.key === "L") {
        toggleLock(selected, "human");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const pairs = useMemo(() => {
    const specs: [TokenName, TokenName][] = [
      ["text", "bg"],
      ["accent-text", "accent"],
      ["muted", "bg"],
    ];
    return specs.map(([fg, bg]) => ({
      pair: [fg, bg] as [string, string],
      ...contrastReport(mix.tokens[fg], mix.tokens[bg]),
    }));
  }, [mix.tokens]);

  const failCount = pairs.filter((p) => !p.aa.text).length;

  return (
    <div className="app">
      <WebMcpBanner status={webmcp} />
      <header className="topbar">
        <div className="brand">
          <h1>RAMP</h1>
          <span className="tag">design token mixer</span>
        </div>
        <div className="fiducials" aria-hidden>
          {FIDUCIALS.map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
        </div>
        <div className="spacer" />
        <button
          type="button"
          className="icon-btn"
          onClick={() => undoLast("human")}
          disabled={mix.history.length === 0}
        >
          Undo
        </button>
      </header>
      <div className="studio">
        <TokenRail
          tokens={mix.tokens}
          locks={mix.locks}
          selected={selected}
          onSelect={setSelected}
          onLock={(t) => toggleLock(t, "human")}
          onChange={(t, hex) => setToken(t, hex, "human")}
        />
        <PreviewKit
          tokens={mix.tokens}
          annotations={mix.annotations}
          onDismiss={dismissAnnotation}
        />
        <aside className="dock">
          <div className="panel-label">Contrast · WCAG 2</div>
          <ContrastMeter pairs={pairs} />
          <div className="panel-label">Moods</div>
          <MoodStrip />
          <div className="panel-label">Export</div>
          <ExportDock tokens={mix.tokens} panel={mix.exportPanel} />
          <div className="panel-label">Activity</div>
          <ActivityFeed events={mix.activity} />
        </aside>
      </div>
      <footer className="status">
        <span>sel {selected}{mix.locks[selected] ? " · locked" : ""}</span>
        <span>
          {failCount === 0 ? "contrast clear" : `${failCount} contrast fail${failCount > 1 ? "s" : ""}`}
        </span>
        <span>{webmcp.connected ? "webmcp live" : "human-only"}</span>
      </footer>
    </div>
  );
}
