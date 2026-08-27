import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { clamp, formatOklch, hexToOklch, oklchToHex } from "../color";
import type { TokenName } from "../types";

type Props = {
  token: TokenName;
  hex: string;
  locked: boolean;
  onChange: (hex: string) => void;
};

function drawPad(canvas: HTMLCanvasElement, chroma: number): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let y = 0; y < h; y++) {
    const l = 1 - y / Math.max(1, h - 1);
    for (let x = 0; x < w; x++) {
      const hue = (x / Math.max(1, w - 1)) * 360;
      const hex = oklchToHex(l, chroma, hue);
      const i = (y * w + x) * 4;
      data[i] = parseInt(hex.slice(1, 3), 16);
      data[i + 1] = parseInt(hex.slice(3, 5), 16);
      data[i + 2] = parseInt(hex.slice(5, 7), 16);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function MixerPad({ token, hex, locked, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ok = hexToOklch(hex) ?? { l: 0.5, c: 0.1, h: 180 };
  const [draft, setDraft] = useState(hex);

  useEffect(() => {
    setDraft(hex);
  }, [hex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const paint = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(120, Math.round(rect.width * dpr));
      const h = Math.max(80, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      drawPad(canvas, clamp(ok.c, 0.02, 0.35));
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [ok.c]);

  function colorAt(clientX: number, clientY: number): void {
    const wrap = wrapRef.current;
    if (!wrap || locked) return;
    const rect = wrap.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    const h = x * 360;
    const l = 1 - y;
    onChange(oklchToHex(l, ok.c, h));
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    colorAt(e.clientX, e.clientY);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (locked || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    colorAt(e.clientX, e.clientY);
  }

  function onChroma(value: number) {
    if (locked) return;
    onChange(oklchToHex(ok.l, value, ok.h));
  }

  function onHexInput(raw: string) {
    if (locked) return;
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) onChange(raw.toLowerCase());
  }

  const left = `${(ok.h / 360) * 100}%`;
  const top = `${(1 - ok.l) * 100}%`;

  return (
    <div className="mixer">
      <div className="readout">
        <span>{token}</span>
        <span>{formatOklch(ok)}</span>
      </div>
      <div
        ref={wrapRef}
        className="pad-wrap"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        role="slider"
        aria-label={`Hue and lightness for ${token}`}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(ok.h)}
        tabIndex={locked ? -1 : 0}
        onKeyDown={(e) => {
          if (locked) return;
          const shift = e.shiftKey ? 10 : 2;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            onChange(oklchToHex(ok.l, ok.c, (ok.h - shift + 360) % 360));
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            onChange(oklchToHex(ok.l, ok.c, (ok.h + shift) % 360));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            onChange(oklchToHex(clamp(ok.l + (e.shiftKey ? 0.05 : 0.01), 0, 1), ok.c, ok.h));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onChange(oklchToHex(clamp(ok.l - (e.shiftKey ? 0.05 : 0.01), 0, 1), ok.c, ok.h));
          }
        }}
      >
        <canvas ref={canvasRef} />
        <div className="crosshair" style={{ left, top }} />
      </div>
      <label className="chroma">
        chroma
        <input
          type="range"
          min={0}
          max={0.32}
          step={0.002}
          value={ok.c}
          disabled={locked}
          onChange={(e) => onChroma(Number(e.target.value))}
        />
        <span>{ok.c.toFixed(2)}</span>
      </label>
      <input
        className="hex-input"
        value={draft}
        disabled={locked}
        spellCheck={false}
        aria-label={`${token} hex`}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          onHexInput(raw);
        }}
        onBlur={() => setDraft(hex)}
      />
    </div>
  );
}
