import type { CSSProperties, ReactNode } from "react";
import type { Annotation, PreviewRegion, Tokens } from "../types";

type Props = {
  tokens: Tokens;
  annotations: Annotation[];
  onDismiss: (id: string) => void;
};

function Pin({
  annotation,
  onDismiss,
}: {
  annotation: Annotation | undefined;
  onDismiss: (id: string) => void;
}) {
  if (!annotation) return null;
  return (
    <div className="pin" role="note">
      <div className="pin-hd">
        <span>agent · {annotation.region}</span>
        <button type="button" onClick={() => onDismiss(annotation.id)} aria-label="Dismiss pin">
          ×
        </button>
      </div>
      {annotation.note}
    </div>
  );
}

function Region({
  id,
  children,
  className = "",
  annotations,
  onDismiss,
}: {
  id: PreviewRegion;
  children: ReactNode;
  className?: string;
  annotations: Annotation[];
  onDismiss: (id: string) => void;
}) {
  const pin = annotations.find((a) => a.region === id);
  return (
    <section className={`region ${className}`} data-region={id}>
      <span className="region-tag">{id}</span>
      <Pin annotation={pin} onDismiss={onDismiss} />
      {children}
    </section>
  );
}

export function PreviewKit({ tokens, annotations, onDismiss }: Props) {
  const style = {
    "--t-bg": tokens.bg,
    "--t-surface": tokens.surface,
    "--t-text": tokens.text,
    "--t-muted": tokens.muted,
    "--t-accent": tokens.accent,
    "--t-accent-text": tokens["accent-text"],
    "--t-border": tokens.border,
    "--t-danger": tokens.danger,
    "--t-accent-200": tokens["accent-200"],
    "--t-accent-600": tokens["accent-600"],
    "--t-accent-900": tokens["accent-900"],
  } as CSSProperties;

  return (
    <div className="stage">
      <div className="bezel">
        <div className="bezel-label">
          <span>Live kit · Kestrel field net</span>
          <span>tokens → preview</span>
        </div>
        <div className="preview" style={style}>
          <div className="preview-grid">
            <Region id="nav" className="wide" annotations={annotations} onDismiss={onDismiss}>
              <nav className="kit-nav" aria-label="Kestrel">
                <span className="logo">KESTREL</span>
                <a className="active" href="#stations">
                  Stations
                </a>
                <a href="#alerts">Alerts</a>
                <a href="#archive">Archive</a>
              </nav>
            </Region>

            <Region id="buttons" annotations={annotations} onDismiss={onDismiss}>
              <div className="btn-row">
                <button type="button" className="kit-btn primary">
                  Deploy probe
                </button>
                <button type="button" className="kit-btn">
                  Export CSV
                </button>
                <button type="button" className="kit-btn danger">
                  Mute frost alert
                </button>
              </div>
            </Region>

            <Region id="stat" annotations={annotations} onDismiss={onDismiss}>
              <div className="stat-grid">
                <div className="stat">
                  <h4>Live stations</h4>
                  <strong>64</strong>
                </div>
                <div className="stat">
                  <h4>Uptime 7d</h4>
                  <strong>99.2%</strong>
                </div>
              </div>
            </Region>

            <Region id="form" annotations={annotations} onDismiss={onDismiss}>
              <form className="kit-form" onSubmit={(e) => e.preventDefault()}>
                <label>
                  Station ID
                  <input defaultValue="KX-19" readOnly />
                </label>
                <label>
                  Elevation (m)
                  <input defaultValue="1240" readOnly />
                </label>
                <label>
                  Field note
                  <textarea defaultValue="Ridge icing after 02:00. Anemometer still clean." readOnly rows={2} />
                </label>
              </form>
            </Region>

            <Region id="card" annotations={annotations} onDismiss={onDismiss}>
              <article className="kit-card">
                <h3>Station 19 — Cascade Ridge</h3>
                <p>
                  1,240 m · wind 18 kt NW · −2.4 °C. Probe 3 reporting every 30s. Last
                  packet 00:12 ago.
                </p>
                <span className="chip">frost watch</span>
              </article>
            </Region>

            <Region id="table" className="wide" annotations={annotations} onDismiss={onDismiss}>
              <table className="kit-table">
                <thead>
                  <tr>
                    <th>Station</th>
                    <th>Temp</th>
                    <th>Wind</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>KX-04 Saddle</td>
                    <td>1.1 °C</td>
                    <td>9 kt</td>
                    <td className="status-ok">nominal</td>
                  </tr>
                  <tr>
                    <td>KX-19 Ridge</td>
                    <td>−2.4 °C</td>
                    <td>18 kt</td>
                    <td className="status-warn">frost</td>
                  </tr>
                  <tr>
                    <td>KX-31 Basin</td>
                    <td>3.8 °C</td>
                    <td>4 kt</td>
                    <td className="status-ok">nominal</td>
                  </tr>
                </tbody>
              </table>
            </Region>

            <Region id="alert" className="wide" annotations={annotations} onDismiss={onDismiss}>
              <div className="kit-alert">
                <span className="mark" />
                <div>
                  <p>Frost advisory for stations above 1,100 m through 06:00.</p>
                  <small>Issued 21:40 local · Kestrel forecast desk</small>
                </div>
              </div>
            </Region>
          </div>
        </div>
      </div>
    </div>
  );
}
