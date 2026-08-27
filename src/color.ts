import type { ContrastResult, Oklch } from "./types";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const OKLCH =
  /^oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:deg)?\s*\)$/i;

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function srgbToLinear(c: number): number {
  const x = clamp(c, 0, 1);
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const x = c;
  if (x <= 0.0031308) return 12.92 * x;
  return 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = HEX.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (c: number) =>
    clamp(Math.round(clamp(c, 0, 1) * 255), 0, 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToRgb(L: number, a: number, b: number): { r: number; g: number; b: number } {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return {
    r: linearToSrgb(lr),
    g: linearToSrgb(lg),
    b: linearToSrgb(lb),
  };
}

export function rgbToOklch(r: number, g: number, b: number): Oklch {
  const { L, a, b: b2 } = rgbToOklab(r, g, b);
  const c = Math.sqrt(a * a + b2 * b2);
  let h = (Math.atan2(b2, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h: c < 1e-6 ? 0 : h };
}

export function oklchToRgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
  const hr = (h * Math.PI) / 180;
  return oklabToRgb(l, c * Math.cos(hr), c * Math.sin(hr));
}

export function oklchToHex(l: number, c: number, h: number): string {
  const { r, g, b } = oklchToRgb(l, c, h);
  return rgbToHex(r, g, b);
}

export function hexToOklch(hex: string): Oklch | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToOklch(rgb.r, rgb.g, rgb.b);
}

export function formatOklch(ok: Oklch): string {
  return `oklch(${ok.l.toFixed(3)} ${ok.c.toFixed(3)} ${ok.h.toFixed(1)})`;
}

export function parseOklch(input: string): Oklch | null {
  const m = OKLCH.exec(input.trim());
  if (!m) return null;
  let l = Number(m[1].replace("%", ""));
  if (m[1].includes("%")) l = l / 100;
  const c = Number(m[2]);
  const h = Number(m[3]);
  if (![l, c, h].every((n) => Number.isFinite(n))) return null;
  return { l: clamp(l, 0, 1), c: clamp(c, 0, 0.5), h: ((h % 360) + 360) % 360 };
}

/** Accept only hex or oklch — never arbitrary CSS. */
export function parseColor(input: string): { hex: string; oklch: Oklch } | null {
  const raw = input.trim();
  if (raw.length > 64) return null;
  if (/[;{}<>]|url\s*\(|expression|javascript:/i.test(raw)) return null;
  const hexMatch = hexToRgb(raw);
  if (hexMatch) {
    const hex = rgbToHex(hexMatch.r, hexMatch.g, hexMatch.b);
    return { hex, oklch: rgbToOklch(hexMatch.r, hexMatch.g, hexMatch.b) };
  }
  const ok = parseOklch(raw);
  if (ok) {
    return { hex: oklchToHex(ok.l, ok.c, ok.h), oklch: ok };
  }
  return null;
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const R = srgbToLinear(rgb.r);
  const G = srgbToLinear(rgb.g);
  const B = srgbToLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const L1 = relativeLuminance(fgHex);
  const L2 = relativeLuminance(bgHex);
  const light = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return (light + 0.05) / (dark + 0.05);
}

export function contrastReport(
  foreground: string,
  background: string,
): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  return {
    foreground,
    background,
    ratio: Math.round(ratio * 100) / 100,
    aa: { text: ratio >= 4.5, large: ratio >= 3 },
    aaa: { text: ratio >= 7, large: ratio >= 4.5 },
  };
}

export function hueLerp(h1: number, h2: number, t: number): number {
  let d = h2 - h1;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return ((h1 + d * t) % 360 + 360) % 360;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function rampFromTo(from: Oklch, to: Oklch, count: number): string[] {
  const out: string[] = [];
  const n = Math.max(2, count);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(
      oklchToHex(lerp(from.l, to.l, t), lerp(from.c, to.c, t), hueLerp(from.h, to.h, t)),
    );
  }
  return out;
}

/** Lightness ramp around a seed hue/chroma: 100 (light) → 900 (dark). */
export function rampFromSeed(seed: Oklch, count: number): string[] {
  const lights = [0.93, 0.86, 0.76, 0.66, 0.56, 0.46, 0.36, 0.28, 0.2];
  const chromas = [0.04, 0.07, 0.1, 0.12, 0.13, 0.12, 0.1, 0.08, 0.06].map(
    (c) => c * (seed.c > 0.02 ? seed.c / 0.12 : 1),
  );
  const n = Math.min(count, lights.length);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(oklchToHex(lights[i], clamp(chromas[i], 0, 0.35), seed.h));
  }
  return out;
}

export function wcagGrade(ratio: number, large: boolean): "AAA" | "AA" | "fail" {
  if (large) {
    if (ratio >= 4.5) return "AAA";
    if (ratio >= 3) return "AA";
    return "fail";
  }
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "fail";
}
