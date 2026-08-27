import { CORE_TOKENS, RAMP_STOPS, type TokenName, type Tokens } from "../types";
import { MixerPad } from "./MixerPad";

type Props = {
  tokens: Tokens;
  locks: Record<TokenName, boolean>;
  selected: TokenName;
  onSelect: (t: TokenName) => void;
  onLock: (t: TokenName) => void;
  onChange: (t: TokenName, hex: string) => void;
};

export function TokenRail({
  tokens,
  locks,
  selected,
  onSelect,
  onLock,
  onChange,
}: Props) {
  return (
    <aside className="rail">
      <div className="panel-label">Token set</div>
      <div className="token-list">
        {CORE_TOKENS.map((name) => (
          <div key={name} style={{ display: "grid", gridTemplateColumns: "1fr 28px", gap: 4 }}>
            <button
              type="button"
              className={`token-row${selected === name ? " selected" : ""}${locks[name] ? " locked" : ""}`}
              onClick={() => onSelect(name)}
            >
              <span className="swatch" style={{ background: tokens[name] }} />
              <span className="name">{name}</span>
              <span className="hex">{tokens[name]}</span>
              <span />
            </button>
            <button
              type="button"
              className={`chip-lock${locks[name] ? " on" : ""}`}
              aria-pressed={locks[name]}
              aria-label={locks[name] ? `Unlock ${name}` : `Lock ${name}`}
              onClick={() => onLock(name)}
              title={locks[name] ? "Unlock" : "Lock"}
            >
              {locks[name] ? "▣" : "□"}
            </button>
          </div>
        ))}
      </div>
      <div className="panel-label">Accent ramp · 100–900</div>
      <div className="ramp-row">
        {RAMP_STOPS.map((name) => (
          <button
            key={name}
            type="button"
            className={`ramp-stop${selected === name ? " selected" : ""}${locks[name] ? " locked" : ""}`}
            style={{ background: tokens[name] }}
            title={`${name} ${tokens[name]}${locks[name] ? " (locked)" : ""}`}
            aria-label={name}
            onClick={() => onSelect(name)}
            onContextMenu={(e) => {
              e.preventDefault();
              onLock(name);
            }}
          />
        ))}
      </div>
      <MixerPad
        token={selected}
        hex={tokens[selected]}
        locked={locks[selected]}
        onChange={(hex) => onChange(selected, hex)}
      />
      <p className="help">
        Drag the pad: hue × lightness. Scroll chroma. <kbd>←→</kbd> hue, <kbd>↑↓</kbd>{" "}
        lightness, <kbd>L</kbd> lock, <kbd>Z</kbd> undo. Right-click a ramp stop to lock it.
      </p>
    </aside>
  );
}
