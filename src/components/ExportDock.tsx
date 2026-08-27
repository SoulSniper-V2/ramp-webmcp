import { useState } from "react";
import { cssExport, exportTokens, jsonExport } from "../store";
import type { Tokens } from "../types";

type Props = {
  tokens: Tokens;
  panel: { format: "css" | "json"; contents: string } | null;
};

export function ExportDock({ tokens, panel }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const contents = panel?.contents ?? cssExport(tokens);
  const format = panel?.format ?? "css";

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="export">
      <div className="row">
        <button type="button" className="copy-btn" onClick={() => exportTokens("css", "human")}>
          CSS vars
        </button>
        <button type="button" className="copy-btn" onClick={() => exportTokens("json", "human")}>
          JSON
        </button>
        <button
          type="button"
          className="copy-btn"
          onClick={() => copy(format, contents)}
        >
          {copied === format ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        readOnly
        value={contents}
        spellCheck={false}
        aria-label="Exported tokens"
      />
      <div className="row">
        <button
          type="button"
          className="copy-btn"
          onClick={() => copy("css", cssExport(tokens))}
        >
          {copied === "css" ? "Copied" : "Copy CSS"}
        </button>
        <button
          type="button"
          className="copy-btn"
          onClick={() => copy("json", jsonExport(tokens))}
        >
          {copied === "json" ? "Copied" : "Copy JSON"}
        </button>
      </div>
    </div>
  );
}
