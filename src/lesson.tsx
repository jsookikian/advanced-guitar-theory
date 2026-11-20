import { useState, useMemo, useEffect, useRef } from "grok/canvas";
import type { CSSProperties, ChangeEvent, ReactNode } from "grok/canvas";

type Step = 1 | 2 | 3 | 4;

interface Dot { s: number; f: number; d: number; add: boolean }
interface KeyDef { id: string; pc: number; letter: number }
interface Pos { p: number; sh: number; octave: boolean; dots: Dot[]; lo: number; hi: number; drop: Set<string>; drop3: Set<string> }

// The sheet's palette, from the source's CSS. Painted as literals (and re-asserted as !important inline) so the page stays a white sheet on any host.
const INK = "#4d3533";
const INK2 = "#806a68";
const PAGE = "#fdfcfb";
const LINE = "#dcd5d4";
const TEAL = "#0f766e";
const RED = "#b42318";
const SERIF = "Aime, Georgia, serif";
const SANS = "'KMR Melange Grotesk', -apple-system, 'Helvetica Neue', Arial, sans-serif";
const EASE = "cubic-bezier(.45,.05,.25,1)";
const MAXF = 24;
// One control system: every control is this tall, with this radius, font and border.
const CH = 36;
const RAD = 10;
const CFS = 13.5;
const BORDER = `1px solid ${INK}`;

const OPEN_PC = [4, 9, 2, 7, 11, 4];
const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
const STR_NAMES = ["E", "A", "D", "G", "B", "e"];

// Jordan's five shapes in C, low E string first: two notes per string, read from the source diagrams.
const BOX: number[][][] = [
  [[3, 6], [3, 5], [2, 5], [3, 5], [3, 5], [3, 6]],
  [[6, 8], [5, 7], [5, 8], [5, 7], [5, 8], [6, 8]],
  [[8, 10], [7, 10], [8, 10], [7, 9], [8, 11], [8, 10]],
  [[10, 12], [10, 13], [10, 12], [9, 12], [11, 13], [10, 12]],
  [[12, 15], [13, 15], [12, 14], [12, 15], [13, 15], [12, 15]],
];
const DROP2: number[][][] = [
  [[2, 2], [3, 3], [4, 3], [5, 3]],
  [[2, 5], [3, 7], [4, 5], [5, 6]],
  [[2, 8], [3, 9], [4, 8], [5, 10]],
  [[2, 12], [3, 12], [4, 11], [5, 12]],
  [[2, 14], [3, 15], [4, 15], [5, 15]],
];

const KEYS: KeyDef[] = [
  { id: "C", pc: 0, letter: 0 }, { id: "Db", pc: 1, letter: 1 }, { id: "D", pc: 2, letter: 1 },
  { id: "Eb", pc: 3, letter: 2 }, { id: "E", pc: 4, letter: 2 }, { id: "F", pc: 5, letter: 3 },
  { id: "F#", pc: 6, letter: 3 }, { id: "G", pc: 7, letter: 4 }, { id: "Ab", pc: 8, letter: 5 },
  { id: "A", pc: 9, letter: 5 }, { id: "Bb", pc: 10, letter: 6 }, { id: "B", pc: 11, letter: 6 },
];
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const STEPS: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 10: 6 };
const SCALE = [0, 2, 4, 5, 7, 9, 10];
const PENTA = [0, 2, 4, 7, 10];
const ARP = [4, 7, 10, 2];
const GM6 = [7, 10, 2, 4];
const CHORD = [0, 4, 7, 10];
const PAINT = ["color", "background-color", "fill", "stroke", "border-color", "border-left-color"];

function spell(k: KeyDef, semi: number): string {
  const l = (k.letter + STEPS[semi]) % 7;
  const pc = (k.pc + semi) % 12;
  const diff = ((pc - NATURAL[l] + 18) % 12) - 6;
  const acc = diff === -2 ? "bb" : diff === -1 ? "b" : diff === 1 ? "#" : diff === 2 ? "x" : "";
  return LETTERS[l] + acc;
}
// Interval name of scale degree d counted from scale degree r (both semitones above the chord root).
function ivName(d: number, r: number): string {
  const ls = (STEPS[d] - STEPS[r] + 7) % 7;
  const semis = (d - r + 12) % 12;
  const diff = ((semis - NATURAL[ls] + 18) % 12) - 6;
  const pre = diff < 0 ? "b".repeat(-diff) : "#".repeat(diff);
  if (ls === 1 && diff === 0) return "9";
  return pre + String(ls + 1);
}
function degOf(s: number, f: number, k: KeyDef): number {
  return (OPEN_PC[s] + f - k.pc + 24) % 12;
}
function pitch(d: Dot): number {
  return OPEN_MIDI[d.s] + d.f;
}
function boxSpan(p: number): [number, number] {
  let lo = 99;
  let hi = 0;
  BOX[p].forEach((fs: number[]) => fs.forEach((f: number) => { lo = Math.min(lo, f); hi = Math.max(hi, f); }));
  return [lo, hi];
}
// The climb: five shapes in neck order, then the first shape again an octave up (verified for all 12 keys, top fret 22).
function sequence(off: number): { p: number; sh: number }[] {
  let best: { order: { p: number; sh: number }[]; top: number } | null = null;
  for (let p = 0; p < 5; p++) {
    const [lo] = boxSpan(p);
    const sh = lo + off - 12 >= 0 ? off - 12 : off;
    const ids = [...Array.from({ length: 5 - p }, (_: unknown, i: number) => p + i), ...Array.from({ length: p }, (_: unknown, i: number) => i)];
    const order = ids.map((q: number) => ({ p: q, sh: q >= p ? sh : sh + 12 }));
    order.push({ p, sh: sh + 12 });
    const top = Math.max(...order.map((o: { p: number; sh: number }) => boxSpan(o.p)[1] + o.sh));
    if (p === 0 && top <= 22) return order;
    if (best === null || top < best.top) best = { order, top };
  }
  return best ? best.order : [];
}
function buildPos(p: number, sh: number, octave: boolean, k: KeyDef): Pos {
  const [l0, h0] = boxSpan(p);
  const lo = l0 + sh;
  const hi = h0 + sh;
  const dots: Dot[] = [];
  for (let s = 0; s < 6; s++) {
    BOX[p][s].forEach((f0: number) => { const f = f0 + sh; dots.push({ s, f, d: degOf(s, f, k), add: false }); });
    for (let f = lo; f <= hi; f++) {
      const d = degOf(s, f, k);
      if (d === 5 || d === 9) dots.push({ s, f, d, add: true });
    }
  }
  const drop = new Set<string>(DROP2[p].map((sf: number[]) => `${sf[0]}-${sf[1] + sh}`));
  // Drop 3: the Drop 2 top note (high e) moves down two octaves to the same fret on the low E string.
  const drop3 = new Set<string>(DROP2[p].map((sf: number[]) => `${sf[0] === 5 ? 0 : sf[0]}-${sf[1] + sh}`));
  return { p, sh, octave, dots, lo, hi, drop, drop3 };
}
function shapeName(p: number, k: KeyDef): string {
  const I = spell(k, 0);
  const III = spell(k, 4);
  const V = spell(k, 7);
  return [`${I}9 / ${III}ø`, `${V}m6`, `${I}9`, `${V}m6/${spell(k, 2)}`, `${III}ø`][p];
}

// Re-assert every inline paint colour as !important, give unpainted HTML elements inherit/transparent,
// and cancel an inverting filter on any host ancestor, so no host or theme rule can repaint the sheet.
function lockPaint(root: HTMLElement): void {
  root.style.setProperty("background-color", PAGE, "important");
  root.style.setProperty("color", INK, "important");
  root.style.setProperty("color-scheme", "only light", "important");
  const filters: string[] = [];
  let el: HTMLElement | null = root.parentElement;
  while (el) {
    const cs = getComputedStyle(el);
    if (cs.filter && cs.filter.includes("invert")) filters.push(cs.filter);
    el = el.parentElement;
  }
  if (filters.length > 0) root.style.setProperty("filter", filters.join(" "), "important");
  else root.style.removeProperty("filter");
  root.querySelectorAll("*").forEach((node: Element) => {
    const st = (node as HTMLElement).style;
    if (!st) return;
    PAINT.forEach((prop: string) => {
      const v = st.getPropertyValue(prop);
      if (v && st.getPropertyPriority(prop) !== "important") st.setProperty(prop, v, "important");
    });
    if (node instanceof HTMLElement) {
      if (!st.getPropertyValue("color")) st.setProperty("color", "inherit", "important");
      if (!st.getPropertyValue("background-color") && !st.getPropertyValue("background-image")) st.setProperty("background-color", "transparent", "important");
    }
  });
}

interface Look { fill: string; stroke: string; sw: number; dashed: boolean; text: string; dotOp: number; textOp: number }

function look(dot: Dot, step: Step, drop2: Set<string>, ringDeg: number): Look {
  const L: Look = { fill: INK, stroke: INK, sw: 0, dashed: false, text: PAGE, dotOp: 1, textOp: 1 };
  if (dot.d === ringDeg) { L.fill = PAGE; L.stroke = INK; L.text = INK; L.sw = 2.5; }
  else if (dot.add) { L.fill = PAGE; L.stroke = INK; L.text = INK; L.sw = 1.6; L.dashed = true; }
  else if (dot.d === 2 && step >= 2 && step <= 3) { L.fill = TEAL; L.stroke = TEAL; L.text = "#ffffff"; }
  if (step === 4) {
    if (drop2.has(`${dot.s}-${dot.f}`)) { L.fill = TEAL; L.stroke = TEAL; L.text = "#ffffff"; L.sw = 0; L.dashed = false; }
    else { L.dotOp = 0.18; L.textOp = 0.35; }
  }
  // The root of the active frame is always a filled red R.
  if (dot.d === ringDeg) { L.fill = RED; L.stroke = RED; L.text = "#ffffff"; L.sw = 0; L.dashed = false; }
  return L;
}

interface BoardProps {
  k: KeyDef;
  shown: Dot[];
  wl: number;
  step: Step;
  labelOf: (d: Dot) => string;
  ringDeg: number;
  lefty: boolean;
  drop2: Set<string>;
  interactive: boolean;
  onHover: (key: string) => void;
  onTap: (key: string) => void;
  path?: Dot[];
  pathRun: number;
}

function Board(props: BoardProps) {
  const { k, shown, wl, step, labelOf, ringDeg, lefty, drop2, interactive, onHover, onTap, path, pathRun } = props;
  const cw = 46;
  const sg = 28;
  const r = 11.5;
  const openW = 32;
  const lab = 26;
  const top = 20;
  const VW = 7 * cw;
  const W = lab + VW + 8;
  // Room below the low E: dot edge (r 11.5) + ~12px gap + fret-number row.
  const H = top + 5 * sg + 38;
  const gx = (f: number): number => { const x = f === 0 ? -openW / 2 : (f - 0.5) * cw; return lefty ? -x : x; };
  const lx = (x: number): number => (lefty ? -x : x);
  const Y = (s: number): number => top + (5 - s) * sg;
  const vs = wl === 0 ? -openW : (wl - 1) * cw;
  const left = lefty ? 8 : lab;
  const tx = lefty ? left + vs + VW : left - vs;
  const fs = 11.5;

  const rank = new Map<string, number>();
  [...shown].sort((a: Dot, b: Dot) => pitch(a) - pitch(b)).forEach((d: Dot, i: number) => rank.set(`${d.s}-${d.f}`, i));
  const all: Dot[] = [];
  for (let s = 0; s < 6; s++) for (let f = 0; f <= MAXF; f++) { const d = degOf(s, f, k); if (SCALE.includes(d)) all.push({ s, f, d, add: d === 5 || d === 9 }); }
  const frets = Array.from({ length: MAXF }, (_: unknown, i: number) => i + 1);
  const midY = (Y(2) + Y(3)) / 2;
  const tr = (ms: number): string => `opacity ${ms}ms ease, fill ${ms}ms ease, stroke ${ms}ms ease`;
  const pathPts = (path ?? []).map((d: Dot) => `${gx(d.f)},${Y(d.s)}`).join(" ");

  return (
    <svg id="nine-board" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: "100%", height: "auto", fontFamily: SANS, overflow: "hidden", backgroundColor: PAGE, animation: "nine-in 300ms ease both" }} role="img" aria-label={`Fretboard from fret ${wl}`}>
      <defs><clipPath id="nine-clip"><rect x={left - 2} y={0} width={VW + 4} height={H} /></clipPath></defs>
      {[0, 1, 2, 3, 4, 5].map((s: number) => (
        <text key={`sn${s}`} x={lefty ? left + VW + 8 : lab - 8} y={Y(s) + 4} textAnchor={lefty ? "start" : "end"} fontSize={11} style={{ fill: INK2 }}>{STR_NAMES[s]}</text>
      ))}
      <g clipPath="url(#nine-clip)">
        <g style={{ transform: `translate(${tx}px, 0px)`, transition: `transform 560ms ${EASE}` }}>
          {[3, 5, 7, 9, 15, 17, 19, 21].map((f: number) => <circle key={`i${f}`} cx={gx(f)} cy={midY} r={5} style={{ fill: INK2 }} opacity={0.22} />)}
          {[12, 24].map((f: number) => (
            <g key={`ii${f}`}>
              <circle cx={gx(f)} cy={(Y(3) + Y(4)) / 2} r={5} style={{ fill: INK2 }} opacity={0.22} />
              <circle cx={gx(f)} cy={(Y(1) + Y(2)) / 2} r={5} style={{ fill: INK2 }} opacity={0.22} />
            </g>
          ))}
          {frets.map((f: number) => <line key={`f${f}`} x1={lx(f * cw)} x2={lx(f * cw)} y1={Y(5)} y2={Y(0)} style={{ stroke: INK2 }} strokeWidth={1.2} opacity={0.55} />)}
          {[0, 1, 2, 3, 4, 5].map((s: number) => <line key={`s${s}`} x1={lx(-openW)} x2={lx(MAXF * cw)} y1={Y(s)} y2={Y(s)} style={{ stroke: INK }} strokeWidth={1} opacity={0.5} />)}
          <line x1={0} x2={0} y1={Y(5) - 0.5} y2={Y(0) + 0.5} style={{ stroke: INK }} strokeWidth={5} />
          {frets.map((f: number) => <text key={`n${f}`} x={gx(f)} y={Y(0) + 32} textAnchor="middle" fontSize={11} style={{ fill: INK2 }}>{f}</text>)}
          {path && path.length > 1 ? (
            <polyline key={`path${pathRun}`} points={pathPts} pathLength={1} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1 1" style={{ stroke: TEAL, opacity: 0.5, animation: `nine-draw ${path.length * 160}ms linear both` }} />
          ) : null}
          {all.map((dot: Dot) => {
            const key = `${dot.s}-${dot.f}`;
            const rk = rank.get(key);
            const vis = rk !== undefined;
            const L = look(dot, step, drop2, ringDeg);
            const delay = vis ? Math.min(rk * 14, 360) : 0;
            const label = labelOf(dot);
            const size = label.length > 2 ? fs - 2 : fs;
            const cx = gx(dot.f);
            const cy = Y(dot.s);
            const gStyle: CSSProperties = {
              opacity: vis ? 1 : 0,
              transform: vis ? "scale(1)" : "scale(0.55)",
              transformBox: "fill-box",
              transformOrigin: "center",
              transition: `opacity 320ms ease ${delay}ms, transform 380ms cubic-bezier(.2,.8,.3,1.15) ${delay}ms`,
              pointerEvents: vis && interactive ? "auto" : "none",
              cursor: interactive ? "pointer" : undefined,
            };
            return (
              <g key={key} data-s={dot.s} data-f={dot.f} data-vis={vis ? 1 : 0} style={gStyle} onMouseEnter={() => onHover(key)} onMouseLeave={() => onHover("")} onClick={() => onTap(key)}>
                <circle cx={cx} cy={cy} r={r} strokeDasharray={L.dashed ? "3 2.4" : undefined} style={{ fill: L.fill, stroke: L.stroke, strokeWidth: L.sw, opacity: L.dotOp, transition: tr(320) }} />
                <text key={label} x={cx} y={cy + size * 0.36} textAnchor="middle" fontSize={size} fontWeight={600} style={{ fill: L.text, opacity: label ? L.textOp : 0, transition: tr(240), animation: "nine-lbl 280ms ease both" }}>{label}</text>
              </g>
            );
          })}
          {(path ?? []).map((d: Dot, i: number) => (
            <text key={`o${pathRun}-${i}`} x={gx(d.f) + (lefty ? -15 : 15)} y={Y(d.s) - 11} textAnchor="middle" fontSize={9.5} fontWeight={600} style={{ fill: TEAL, animation: `nine-in 260ms ease ${i * 160}ms both` }}>{i + 1}</text>
          ))}
        </g>
      </g>
    </svg>
  );
}

// Segmented control: equal segments with a filled indicator that slides to the selected one.
function Seg(props: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; disabled?: boolean; weights?: number[] }) {
  const { options, value, onChange, disabled } = props;
  const n = options.length;
  const i = Math.max(0, options.findIndex((o: { value: string; label: string }) => o.value === value));
  // Optional column weights let longer labels take more room; the indicator follows them.
  const w = props.weights && props.weights.length === n ? props.weights : options.map(() => 1);
  const sum = w.reduce((a: number, b: number) => a + b, 0);
  const before = w.slice(0, i).reduce((a: number, b: number) => a + b, 0);
  return (
    <div role="radiogroup" className="nine-seg" style={{ position: "relative", display: "grid", gridTemplateColumns: w.map((x: number) => `minmax(0, ${x}fr)`).join(" "), height: CH, border: BORDER, borderRadius: RAD, overflow: "hidden", backgroundColor: PAGE, color: INK, boxSizing: "border-box", width: "100%" }}>
      <span aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: `${(before * 100) / sum}%`, width: `${(w[i] * 100) / sum}%`, backgroundColor: INK, transition: `left 200ms ${EASE}, width 200ms ${EASE}` }} />
      {options.map((o: { value: string; label: string }, j: number) => {
        const on = j === i;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} tabIndex={disabled ? -1 : 0} onClick={() => onChange(o.value)} style={{ position: "relative", zIndex: 1, height: "100%", border: 0, borderLeft: j > 0 ? `1px solid ${i === j || i === j - 1 ? "transparent" : LINE}` : "0", color: on ? PAGE : INK, fontFamily: SANS, fontSize: CFS, fontWeight: 500, lineHeight: "18px", padding: "0 4px", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: "color 200ms ease" }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function Field(props: { label: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, backgroundColor: PAGE, color: INK, ...props.style }}>
      {props.label ? <span style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, lineHeight: "14px", letterSpacing: "0.02em", color: INK2, backgroundColor: PAGE }}>{props.label}</span> : null}
      {props.children}
    </div>
  );
}

function Check(props: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={props.on} className="nine-check" onClick={props.onClick} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: CH, backgroundColor: PAGE, border: 0, padding: 0, cursor: "pointer", fontFamily: SANS, fontSize: CFS, lineHeight: "18px", color: INK, whiteSpace: "nowrap" }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, border: BORDER, backgroundColor: props.on ? INK : PAGE, color: PAGE, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, lineHeight: "12px", boxSizing: "border-box", transition: "background-color 180ms ease" }}>{props.on ? "✓" : ""}</span>
      <span style={{ color: INK, backgroundColor: PAGE }}>{props.label}</span>
    </button>
  );
}

type KeyKind = "root" | "teal" | "dash" | "fill";

// Canvas text wrap for the share image; returns the last baseline used.
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  const words = text.split(" ");
  let lineTxt = "";
  let yy = y;
  words.forEach((w: string) => {
    const t = lineTxt ? `${lineTxt} ${w}` : w;
    if (lineTxt && ctx.measureText(t).width > maxW) { ctx.fillText(lineTxt, x, yy); lineTxt = w; yy += lh; }
    else lineTxt = t;
  });
  if (lineTxt) ctx.fillText(lineTxt, x, yy);
  return yy;
}

function Key(props: { kind: KeyKind; children: ReactNode }) {
  const { kind } = props;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", color: INK2, backgroundColor: PAGE }}>
      <svg width={12} height={12} viewBox="0 0 16 16" style={{ display: "block" }}>
        <circle cx={8} cy={8} r={kind === "root" ? 7.5 : 6.5} strokeWidth={kind === "dash" ? 1.4 : 0} strokeDasharray={kind === "dash" ? "2.5 2" : undefined} style={{ fill: kind === "fill" ? INK : kind === "teal" ? TEAL : kind === "root" ? RED : PAGE, stroke: kind === "teal" ? TEAL : kind === "root" ? RED : INK }} />
        {kind === "root" ? <text x={8} y={11.6} textAnchor="middle" fontSize={10} fontWeight={700} style={{ fill: "#ffffff" }}>R</text> : null}
      </svg>
      <span style={{ color: INK2, backgroundColor: PAGE }}>{props.children}</span>
    </span>
  );
}

const btn = (primary: boolean, disabled: boolean): CSSProperties => ({
  height: CH, borderRadius: RAD, padding: "0 14px", border: BORDER, backgroundColor: primary ? INK : PAGE, color: primary ? PAGE : INK,
  cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1, fontFamily: SANS, fontSize: CFS, fontWeight: 500, lineHeight: "18px",
  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxSizing: "border-box", transition: "opacity 200ms ease",
});

type Mode = "chord" | "arp" | "penta" | "mixo" | "grip" | "drop3";
const MODE_STEP: Record<Mode, Step> = { chord: 1, arp: 2, penta: 2, mixo: 3, grip: 4, drop3: 4 };
function modeDots(dots: Dot[], m: Mode): Dot[] {
  if (m === "chord") return dots.filter((d: Dot) => !d.add && CHORD.includes(d.d));
  if (m === "arp") return dots.filter((d: Dot) => !d.add && ARP.includes(d.d));
  if (m === "penta") return dots.filter((d: Dot) => !d.add);
  return dots;
}
interface Card { mode: Mode | null; kind: string }
// The lesson: six idea cards, then Explore. The board arrows move the shape anywhere on the neck on every card.
const CARDS: Card[] = [
  { mode: "chord", kind: "c7" },
  { mode: "arp", kind: "lose" },
  { mode: "arp", kind: "names" },
  { mode: "penta", kind: "penta" },
  { mode: "mixo", kind: "mixo" },
  { mode: null, kind: "voicing" },
  { mode: null, kind: "explore" },
];
// Every instance of the five shapes that fits between the nut and fret 24, ordered low to high.
function instances(k: KeyDef): Pos[] {
  const out: Pos[] = [];
  for (let p = 0; p < 5; p++) {
    const [l0, h0] = boxSpan(p);
    for (let m = -2; m <= 3; m++) {
      const sh = k.pc + 12 * m;
      if (l0 + sh >= 0 && h0 + sh <= MAXF) out.push(buildPos(p, sh, false, k));
    }
  }
  return out.sort((a: Pos, b: Pos) => a.lo - b.lo || a.p - b.p);
}
// Short labels for the step chips (the progress row doubles as navigation: any card is one tap away).
const STEP_LABEL = ["C7", "No root", "Names", "Penta", "Mixo", "Drop", "Explore"];
function homeIndex(list: Pos[]): number {
  const i = list.findIndex((q: Pos) => q.p === 0 && q.lo >= 1);
  return i >= 0 ? i : 0;
}

export default function App() {
  const [card, setCard] = useState<number>(0);
  const [dir, setDir] = useState<number>(1);
  const [keyId, setKeyId] = useState<string>("C");
  const [show, setShow] = useState<string>("intervals");
  const [frame, setFrame] = useState<string>("0");
  const [lefty, setLefty] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [cyc, setCyc] = useState<number>(0);
  const [cycTouched, setCycTouched] = useState<boolean>(false);
  const [layerMode, setLayerMode] = useState<string>("penta");
  const [inst, setInst] = useState<number>(-1);
  const [jump, setJump] = useState<number>(0);
  const [exMode, setExMode] = useState<string>("explore");
  const [vKind, setVKind] = useState<string>("grip");
  const [tip, setTip] = useState<{ id: string; cx: number; top: number; bottom: number } | null>(null);
  const pressRef = useRef<{ t: number; shown: boolean }>({ t: 0, shown: false });
  useEffect(() => {
    const h = () => setTip(null);
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, []);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const [reveal, setReveal] = useState<Set<string>>(new Set<string>());
  const [hover, setHover] = useState<string>("");
  const [pathRun, setPathRun] = useState<number>(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const total = CARDS.length;
  const go = (i: number) => {
    const t = Math.max(0, Math.min(total - 1, i));
    setCard((c: number) => { setDir(t >= c ? 1 : -1); return t; });
    setReveal(new Set<string>()); setHover(""); setPathRun(0);
    if (t === 2) { setCyc(Number(frameRef.current)); setCycTouched(false); }
  };
  const cardRef = useRef<number>(0);
  cardRef.current = card;
  const frameRef = useRef<string>("0");
  frameRef.current = frame;

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "SELECT" || t.tagName === "INPUT")) return;
      if (e.key === "ArrowRight") go(cardRef.current + 1);
      if (e.key === "ArrowLeft") go(cardRef.current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Card 3 cycles the same four notes through C9, Eø and Gm6 until the player taps a name.
  useEffect(() => {
    if (card !== 2 || cycTouched) return;
    const t = setInterval(() => setCyc((c: number) => (c === 0 ? 4 : c === 4 ? 7 : 0)), 2400);
    return () => clearInterval(t);
  }, [card, cycTouched]);
  // Runs after every render: keeps the sheet's paint locked against host and theme styles.
  useEffect(() => { if (rootRef.current) lockPaint(rootRef.current); });

  const k: KeyDef = KEYS.find((x: KeyDef) => x.id === keyId) ?? KEYS[0];
  const seq: Pos[] = useMemo(() => instances(k), [keyId]);
  const C = CARDS[card];
  const shapeIdx = inst >= 0 && inst < seq.length ? inst : homeIndex(seq);
  // Board arrows and swipe step through every shape instance on the neck, on every card, and the position persists.
  // Past either end wraps to the other end with a quick fade instead of a 20-fret slide.
  const canShape = (d: number): boolean => seq.length > 1 && d !== 0;
  const stepShape = (d: number): void => {
    const raw = shapeIdx + d;
    const t = (raw + seq.length) % seq.length;
    if (raw !== t) setJump((j: number) => j + 1);
    setInst(t);
    setReveal(new Set<string>()); setHover(""); setPathRun(0);
  };
  // Direct shape pick: the same shape number nearest the current position, so the board barely moves.
  const pickShape = (p: number): void => {
    let best = -1;
    seq.forEach((q: Pos, i: number) => { if (q.p === p && (best < 0 || Math.abs(q.lo - seq[shapeIdx].lo) < Math.abs(seq[best].lo - seq[shapeIdx].lo))) best = i; });
    if (best < 0 || best === shapeIdx) return;
    setInst(best);
    setReveal(new Set<string>()); setHover(""); setPathRun(0);
  };
  const cur = seq[shapeIdx];
  const mode: Mode = C.kind === "voicing" ? (vKind as Mode) : C.kind === "explore" ? (exMode === "practise" ? "arp" : (layerMode as Mode)) : (C.mode as Mode);
  const quiz = C.kind === "explore" && exMode === "quiz";
  // One global label mode: every dot on every card follows Show (Intervals / Notes).
  const intervals = show === "intervals";
  // One global Count-from frame for every card; card 3 shows its own demo cycle, which starts from (and when tapped, sets) the global frame.
  const eff = card === 2 ? cyc : Number(frame);
  const ringDeg = eff;
  const iv = (d: number): string => ivName(d, eff);
  const n = (d: number): string => spell(k, d);
  const I = n(0);
  const III = n(4);
  const V = n(7);
  const notes = (ds: number[]): string => ds.map(n).join(" ");
  const ivs = (ds: number[]): string => ds.map(iv).join(" ");

  const shown = modeDots(cur.dots, mode);
  const labelOf = (d: Dot): string => {
    const key = `${d.s}-${d.f}`;
    if (quiz && !reveal.has(key) && hover !== key) return "";
    if (!intervals) return n(d.d);
    return d.d === eff ? "R" : iv(d.d);
  };
  const sorted = [...cur.dots].filter((d: Dot) => !d.add).sort((a: Dot, b: Dot) => pitch(a) - pitch(b));
  const low3 = sorted.find((d: Dot) => d.d === 4);
  const arpPath = low3 ? sorted.filter((d: Dot) => ARP.includes(d.d) && pitch(d) >= pitch(low3)) : [];
  const dropNotes: number[] = DROP2[cur.p].map((sf: number[]) => degOf(sf[0], sf[1] + cur.sh, k));
  // Name a voicing as an inversion of the Count-from chord: slash the actual lowest note unless it is that chord's root.
  const nameFrame = eff;
  const vname = (set: Set<string>): string => {
    const ds = [...set].map((key: string) => { const [s, f] = key.split("-").map(Number); return { s, f, d: degOf(s, f, k), add: false }; });
    const bass = ds.reduce((a: Dot, b: Dot) => (pitch(b) < pitch(a) ? b : a));
    const base = nameFrame === 0 ? `${I}9` : nameFrame === 4 ? `${III}\u00f8` : `${V}m6`;
    return bass.d === nameFrame ? base : `${base}/${n(bass.d)}`;
  };
  const shapeLabel = (q: Pos): string => `Shape ${q.p + 1}`;
  const quizCount = shown.filter((d: Dot) => reveal.has(`${d.s}-${d.f}`)).length;

  // One short line per shape (by shape number) on how it joins its neighbours, checked against the shape data:
  // each shape's top note on every string is the next shape's bottom note.
  const NECK: string[] = [
    `The home shape, ${I}9 / ${III}ø. Its top notes are where Shape 2 starts.`,
    `Its bottom notes are Shape 1's top notes. Read from ${V}, it's ${V}m6: ${notes(GM6)}.`,
    `${I} on both E strings, the 9 (${n(2)}) two frets above: the ${I}9 sound.`,
    `Both E strings start on the 9, ${n(2)}: lead with the colour note, not the root.`,
    `Both E strings start on the 3, ${III}, so from its lowest note it reads as ${III}ø.`,
  ];
  const layerSeg = () => segBtn([{ value: "arp", label: "Arpeggio" }, { value: "penta", label: "Pentatonic" }, { value: "mixo", label: "Mixolydian" }, { value: "grip", label: "Drop 2" }, { value: "drop3", label: "Drop 3" }], layerMode, (v: string) => setLayerMode(v), [9, 10, 10, 7, 7]);

  const segBtn = (o: { value: string; label: string }[], v: string, on: (x: string) => void, weights?: number[]) => <Seg options={o} value={v} onChange={on} weights={weights} />;
  const head = (t: string, extra?: string) => (
    <h2 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 400, lineHeight: "26px", letterSpacing: "-0.4px", color: INK, backgroundColor: PAGE, margin: 0 }}>
      {t}{extra ? <span style={{ fontFamily: SANS, fontSize: 12.5, color: INK2, backgroundColor: PAGE, letterSpacing: 0, marginLeft: 8 }}>{extra}</span> : null}
    </h2>
  );
  const line = (t: ReactNode) => <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 350, lineHeight: "20px", letterSpacing: "-0.14px", color: INK, backgroundColor: PAGE, margin: 0 }}>{t}</p>;

  let body: ReactNode = null;
  if (C.kind === "c7") body = <>{head(`Here's ${I}7.`)}{line(`Just the chord tones, ${notes(CHORD)} (1 3 5 b7 of ${I}7). ${eff === 0 ? `R marks the root, ${I}.` : `Counting from ${n(eff)}, so R marks ${n(eff)}.`}`)}</>;
  else if (C.kind === "lose") body = <>{head("Lose the root, add the 9.")}{line(`The ${I}s fade out, ${n(2)} fades in. These four notes, ${notes(ARP)}, are ${III}ø or ${V}m6`)}</>;
  else if (C.kind === "names") body = (
    <>{head("Same notes, three names.")}{line(`Over a ${I} bass they spell ${I}9 with no root. Read them from ${III} or ${V} and they're ${III}ø or ${V}m6.`)}
      <div style={{ marginTop: 4 }}>{segBtn([{ value: "0", label: `${I}9` }, { value: "4", label: `${III}ø` }, { value: "7", label: `${V}m6` }], String(cyc), (v: string) => { setCyc(Number(v)); setCycTouched(true); setFrame(v); })}</div></>
  );
  else if (C.kind === "penta") body = <>{head("Put the root back: the dominant pentatonic.")}{line(`${notes(PENTA)} (${ivs(PENTA)}). One shape: a scale to run and a chord to arpeggiate.`)}</>;
  else if (C.kind === "mixo") body = <>{head(`Fill the gaps: ${I} Mixolydian.`)}{line(`${n(5)} and ${n(9)} fade in dashed. Over ${I}7 the 13 (${n(9)}) is safe; the 4 (${n(5)}) is a passing note into the 3 (${n(4)}).`)}</>;
  else if (C.kind === "voicing") body = (
    <>{head(vKind === "grip" ? "Grab it as a chord." : "Drop 3: new bass, new name.", `${vKind === "grip" ? "Drop 2" : "Drop 3"} \u00b7 ${vname(vKind === "grip" ? cur.drop : cur.drop3)}`)}
      {line(vKind === "grip" ? `The same four notes stacked: ${III}\u00f8, or ${I}9 without the root. Comp the shape you solo with.` : "Drop 3: the top note drops to the low E, so the bass changes, and so does the name.")}
      <div style={{ marginTop: 4 }}>{segBtn([{ value: "grip", label: "Drop 2" }, { value: "drop3", label: "Drop 3" }], vKind, (v: string) => setVKind(v))}</div></>
  );
  else body = (
    <>{segBtn([{ value: "explore", label: "Explore" }, { value: "practise", label: "Practise" }, { value: "quiz", label: "Quiz" }], exMode, (v: string) => { setExMode(v); setReveal(new Set<string>()); setHover(""); setPathRun(0); })}
      {exMode === "explore" ? (
        <>{line(NECK[cur.p])}<div style={{ marginTop: 4 }}>{layerSeg()}</div></>
      ) : exMode === "practise" ? (
        <>{line(`Run ${III}\u00f8 up from the lowest ${III} and back \u00b7 land ${n(2)} on beat 1, resolve to ${I} \u00b7 play Drop 2, then the arpeggio around it.`)}
          <div style={{ marginTop: 4 }}><button type="button" className="nine-btn" style={btn(false, false)} onClick={() => setPathRun(pathRun + 1)}>Show path</button></div></>
      ) : (
        <>{line(`Labels hidden: name each note${intervals ? "'s interval" : ""}, then tap to check. ${quizCount} of ${shown.length} revealed.`)}<div style={{ marginTop: 4 }}>{layerSeg()}</div></>
      )}</>
  );

  const legendSpec: { kind: KeyKind; text: string }[] = [];
  if (shown.some((d: Dot) => d.d === ringDeg)) legendSpec.push({ kind: "root", text: `R = root (${n(ringDeg)})` });
  if (mode === "chord") legendSpec.push({ kind: "fill", text: "chord tones" });
  if (mode === "arp" || mode === "penta" || mode === "mixo") legendSpec.push({ kind: "teal", text: eff === 0 ? `the 9 (${n(2)})` : `${n(2)}, the 9 of ${I}` });
  if (mode === "mixo") legendSpec.push({ kind: "dash", text: eff === 0 ? `4 and 6 (${n(5)} ${n(9)})` : `${n(5)} ${n(9)}, the 4 and 6 of ${I}` });
  if (mode === "grip") legendSpec.push({ kind: "teal", text: C.kind === "voicing" ? "Drop 2" : `Drop 2 \u00b7 ${vname(cur.drop)}` });
  if (mode === "drop3") legendSpec.push({ kind: "teal", text: C.kind === "voicing" ? "Drop 3" : `Drop 3 \u00b7 ${vname(cur.drop3)}` });
  const legend: ReactNode[] = legendSpec.map((it: { kind: KeyKind; text: string }) => <Key key={it.kind + it.text} kind={it.kind}>{it.text}</Key>);

  // Share: draw the current diagram onto a 1080x1080 paper-white PNG, then hand it to the share sheet (or download it).
  const LAYER_NAME: Record<Mode, string> = { chord: "Chord tones", arp: "Arpeggio", penta: "Pentatonic", mixo: "Mixolydian", grip: "Drop 2", drop3: "Drop 3" };
  const voicing = mode === "grip" ? vname(cur.drop) : mode === "drop3" ? vname(cur.drop3) : "";
  const frameBase = eff === 0 ? `${I}9` : eff === 4 ? `${III}\u00f8` : `${V}m6`;
  const shareHead = `${shapeLabel(cur)}: ${shapeName(cur.p, k)} \u00b7 ${LAYER_NAME[mode]}${voicing ? ` \u00b7 ${voicing}` : ""}`;
  const shareMeta = `Key of ${keyId} \u00b7 ${intervals ? `Intervals from ${frameBase}` : "Note names"}`;
  const shareName = `${frameBase}-shape${cur.p + 1}-fret${cur.lo}-${LAYER_NAME[mode]}`.toLowerCase().replace(/\u00f8/g, "o").replace(/#/g, "sharp").replace(/[^a-z0-9-]/g, "") + ".png";
  const sharePng = async (): Promise<void> => {
    const svg = document.getElementById("nine-board") as SVGSVGElement | null;
    if (!svg) return;
    try { await document.fonts.ready; } catch { /* draw with fallbacks */ }
    const S = 1080;
    const M = 80;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = PAGE;
    ctx.fillRect(0, 0, S, S);
    let y = M + 44;
    ctx.fillStyle = INK;
    ctx.font = `400 46px ${SERIF}`;
    y = wrapText(ctx, "Dominant Pentatonics and Half Diminished Chords", M, y, S - 2 * M, 56);
    ctx.fillStyle = INK2;
    ctx.font = `400 26px ${SANS}`;
    y += 46;
    ctx.fillText(shareMeta, M, y);
    ctx.fillStyle = INK;
    ctx.font = `400 40px ${SERIF}`;
    y = wrapText(ctx, shareHead, M, y + 72, S - 2 * M, 50);
    // Legend, drawn with the page's dot styles.
    ctx.font = `400 26px ${SANS}`;
    let x = M;
    y += 58;
    legendSpec.forEach((it: { kind: KeyKind; text: string }) => {
      const w = 30 + ctx.measureText(it.text).width;
      if (x > M && x + w > S - M) { x = M; y += 40; }
      ctx.beginPath();
      ctx.arc(x + 11, y - 9, 11, 0, Math.PI * 2);
      ctx.setLineDash(it.kind === "dash" ? [4, 3] : []);
      ctx.fillStyle = it.kind === "root" ? RED : it.kind === "teal" ? TEAL : it.kind === "fill" ? INK : PAGE;
      ctx.fill();
      if (it.kind === "dash") { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.setLineDash([]);
      if (it.kind === "root") { ctx.fillStyle = "#ffffff"; ctx.font = `700 14px ${SANS}`; ctx.textAlign = "center"; ctx.fillText("R", x + 11, y - 4); ctx.textAlign = "left"; ctx.font = `400 26px ${SANS}`; }
      ctx.fillStyle = INK2;
      ctx.fillText(it.text, x + 30, y);
      x += w + 36;
    });
    // The board: a static copy of the live SVG at its final state (no fades, no animations).
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const vb = svg.viewBox.baseVal;
    const bw = S - 2 * M;
    const bh = (bw * vb.height) / vb.width;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(bw));
    clone.setAttribute("height", String(bh));
    clone.removeAttribute("id");
    [clone, ...Array.from(clone.querySelectorAll("*"))].forEach((el: Element) => {
      const st = (el as SVGElement).style;
      if (!st) return;
      st.setProperty("animation", "none", "important");
      st.setProperty("transition", "none", "important");
    });
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    await new Promise<void>((res: () => void, rej: (e: unknown) => void) => { img.onload = () => res(); img.onerror = (e: unknown) => rej(e); img.src = url; });
    const top = y + 40;
    const by = top + Math.max(0, (S - M - top - bh) / 2);
    ctx.drawImage(img, M, by, bw, bh);
    URL.revokeObjectURL(url);
    const blob = await new Promise<Blob | null>((res: (b: Blob | null) => void) => cv.toBlob(res, "image/png"));
    if (!blob) return;
    const file = new File([blob], shareName, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file], title: shareHead }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = shareName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  // Hover labels: one styled tooltip for the step segments, shape chips, board arrows, share and settings.
  // Mouse hover and keyboard focus-visible show it; on touch a long-press shows it briefly (a tap still acts).
  const nb = (d: number): string => {
    const raw = shapeIdx + d;
    const q = seq[(raw + seq.length) % seq.length];
    return `${shapeLabel(q)} \u00b7 frets ${q.lo}\u2013${q.hi}${raw < 0 ? " (wraps to the top)" : raw >= seq.length ? " (wraps to the nut)" : ""}`;
  };
  const STEP_TITLE = [`Here's ${I}7`, "Lose the root, add the 9", "Same notes, three names", "The dominant pentatonic", `${I} Mixolydian: the 4 and 6`, "Drop 2 and Drop 3", "Explore, practise, quiz"];
  const tipText = (id: string): string => {
    if (id.startsWith("step")) { const i = Number(id.slice(4)); return `${i + 1} \u00b7 ${STEP_TITLE[i]}`; }
    if (id.startsWith("shape")) { const p = Number(id.slice(5)); return `Shape ${p + 1} \u00b7 ${shapeName(p, k)}`; }
    if (id === "prev") return nb(-1);
    if (id === "next") return nb(1);
    if (id === "share") return "Share as image";
    if (id === "settings") return open ? "Hide settings" : "Settings: labels, key, left-handed";
    return "";
  };
  const showTip = (id: string, el: Element): void => { const r = el.getBoundingClientRect(); setTip({ id, cx: r.left + r.width / 2, top: r.top, bottom: r.bottom }); };
  const tipOn = (id: string) => ({
    onPointerEnter: (e: { pointerType: string; currentTarget: Element }) => { if (e.pointerType === "mouse") showTip(id, e.currentTarget); },
    onPointerLeave: (e: { pointerType: string }) => { if (e.pointerType === "mouse") setTip(null); },
    onFocus: (e: { currentTarget: Element }) => { if (e.currentTarget.matches(":focus-visible")) showTip(id, e.currentTarget); },
    onBlur: () => setTip(null),
    onTouchStart: (e: { currentTarget: Element }) => {
      const el = e.currentTarget;
      pressRef.current.shown = false;
      window.clearTimeout(pressRef.current.t);
      pressRef.current.t = window.setTimeout(() => {
        pressRef.current.shown = true;
        showTip(id, el);
        window.setTimeout(() => setTip((t: { id: string } | null) => (t && t.id === id ? null : t) as typeof tip), 1500);
      }, 450);
    },
    onTouchMove: () => window.clearTimeout(pressRef.current.t),
    onTouchEnd: (e: { preventDefault: () => void }) => { window.clearTimeout(pressRef.current.t); if (pressRef.current.shown) e.preventDefault(); },
  });
  const hoverDot = hover ? cur.dots.find((d: Dot) => `${d.s}-${d.f}` === hover) : undefined;

  const css = ":root,html,body{color-scheme:only light!important;background:#fdfcfb!important;color:#4d3533!important;margin:0}"
    + " html body #nine-root#nine-root,html body #nine-root#nine-root div,html body #nine-root#nine-root p,html body #nine-root#nine-root h1,html body #nine-root#nine-root h2{color-scheme:only light!important}"
    + " html body #nine-root#nine-root h1,html body #nine-root#nine-root h2,html body #nine-root#nine-root p,html body #nine-root#nine-root li{color:#4d3533!important}"
    + " #nine-root button,#nine-root select{-webkit-appearance:none;appearance:none;margin:0;font-family:inherit}"
    + " #nine-root button:focus-visible,#nine-root select:focus-visible{outline:2px solid #0f766e;outline-offset:2px}"
    + " #nine-root .nine-seg button::after{content:'';position:absolute;inset:0;background:#4d3533;opacity:0;transition:opacity 150ms ease;pointer-events:none}"
    + " #nine-root .nine-seg button[aria-checked=false]:hover::after{opacity:.07}"
    + " #nine-root .nine-btn:hover:not(:disabled){filter:brightness(.96)} #nine-root .nine-btn-primary:hover:not(:disabled){filter:brightness(1.15)}"
    + " #nine-root .nine-card{height:100px} #nine-root .nine-card.nine-tall{height:124px} @media (max-width:600px){#nine-root .nine-card{height:118px} #nine-root .nine-card.nine-tall{height:144px}}"
    + " @keyframes nine-in{from{opacity:0}to{opacity:1}} @keyframes nine-lbl{from{opacity:0}to{opacity:1}} @keyframes nine-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}"
    + " @keyframes nine-r{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}} @keyframes nine-l{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}"
    + " @keyframes nine-pop{from{opacity:0;transform:translateY(-4px) scale(.96)}to{opacity:1;transform:none}}"
    + " @media (hover:hover){#nine-root .nine-arrow:hover:not(:disabled) svg{opacity:.6}}"
    + " @media (hover:hover){#nine-root .nine-icon:hover svg{opacity:.6}} #nine-root .nine-icon svg{transition:opacity 150ms ease}"
    + " html,body{overflow-x:hidden!important;max-width:100%} #nine-root{overflow-x:clip;max-width:100vw} #nine-root svg{max-width:100%}";

  return (
    <div ref={rootRef} id="nine-root" className="nine-root" style={{ backgroundColor: PAGE, color: INK, colorScheme: "only light", minHeight: "100vh", width: "100%", padding: "12px 16px 16px", fontFamily: SANS, boxSizing: "border-box" }}>
      <style>{css}</style>
      <div style={{ maxWidth: 640, margin: "0 auto", backgroundColor: PAGE, color: INK, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ backgroundColor: PAGE }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 400, lineHeight: "26px", letterSpacing: "-0.5px", color: INK, backgroundColor: PAGE, margin: 0 }}>Dominant Pentatonics and Half Diminished Chords</h1>
        </div>

        {/* Step chips: progress and navigation in one row. The bar fills up to the current card; tap any chip to jump. */}
        <nav aria-label="Lesson steps" style={{ display: "grid", gridTemplateColumns: `repeat(${total}, minmax(0,1fr))`, gap: 3, backgroundColor: PAGE }}>
          {STEP_LABEL.map((lb: string, i: number) => (
            <button key={lb} type="button" className="nine-step" aria-label={`Step ${i + 1} of ${total}: ${lb}`} aria-current={i === card ? "step" : undefined} {...tipOn(`step${i}`)} onClick={() => go(i)} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5, height: 32, minWidth: 0, padding: "2px 0", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", color: INK, backgroundColor: PAGE }}>
              <span style={{ display: "block", height: 4, borderRadius: 2, backgroundColor: i <= card ? TEAL : LINE, transition: "background-color 300ms ease" }} />
              <span style={{ display: "block", fontFamily: SANS, fontSize: 11, lineHeight: "14px", fontWeight: i === card ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "clip", textAlign: "center", color: i === card ? INK : INK2, backgroundColor: PAGE }}>{lb}</span>
            </button>
          ))}
        </nav>

        <div className={C.kind === "explore" ? "nine-card nine-tall" : "nine-card"} style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", backgroundColor: PAGE }}>
          <div key={`card${card}`} style={{ display: "flex", flexDirection: "column", gap: 4, animation: `${dir > 0 ? "nine-r" : "nine-l"} 340ms ${EASE} both`, backgroundColor: PAGE }}>{body}</div>
        </div>

        <div style={{ minHeight: 34, minWidth: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: 12, color: INK2, backgroundColor: PAGE, lineHeight: "16px" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", backgroundColor: PAGE }}>
            <span key={`lg${mode}${ringDeg}${keyId}${quiz ? 1 : 0}${quiz ? hover : ""}`} style={{ display: "flex", flexWrap: "wrap", minWidth: 0, columnGap: 12, rowGap: 2, animation: "nine-in 320ms ease both", backgroundColor: PAGE }}>
              {quiz ? <span style={{ color: INK, backgroundColor: PAGE, whiteSpace: "nowrap" }}>{hoverDot ? (hoverDot.d === 0 ? `${I}: the root of ${I}7` : `${n(hoverDot.d)}: the ${ivName(hoverDot.d, 0)} of ${I}7`) : "Tap a dot to reveal it"}</span> : legend}
            </span>
          </div>
            <button type="button" className="nine-icon" aria-label="Share this diagram as an image" {...tipOn("share")} onClick={() => { void sharePng(); }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 32, width: 32, padding: 0, margin: 0, flex: "0 0 auto", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", color: INK, backgroundColor: PAGE }}>
              <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" style={{ display: "block" }}>
                <path d="M6.5 7.5H4.5v8.5h9V7.5h-2" fill="none" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: INK }} />
                <path d="M9 11V2.2M6.2 5L9 2.2L11.8 5" fill="none" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: INK }} />
              </svg>
            </button>
            <button type="button" className="nine-icon" aria-label="Display settings" aria-controls="nine-settings" aria-expanded={open} {...tipOn("settings")} onClick={() => setOpen(!open)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 3, height: 32, minWidth: 32, padding: 0, margin: 0, flex: "0 0 auto", border: 0, borderRadius: 0, boxShadow: "none", outlineOffset: 2, cursor: "pointer", color: INK, backgroundColor: PAGE }}>
              <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" style={{ display: "block" }}>
                {[[4, 6], [9, 12], [14, 8]].map((yx: number[]) => (
                  <g key={yx[0]}>
                    <line x1={2} x2={16} y1={yx[0]} y2={yx[0]} strokeWidth={1.4} strokeLinecap="round" style={{ stroke: INK }} />
                    <circle cx={yx[1]} cy={yx[0]} r={2.1} strokeWidth={1.4} style={{ fill: PAGE, stroke: INK }} />
                  </g>
                ))}
              </svg>
              <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true" style={{ display: "block", transform: open ? "rotate(180deg)" : "none", transition: `transform 200ms ${EASE}` }}>
                <path d="M2 3.5 L5 6.5 L8 3.5" fill="none" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: INK }} />
              </svg>
            </button>
        </div>

        {/* Inline settings: expands in the flow above the board and stays open across cards until toggled. */}
        <div id="nine-settings" aria-hidden={!open} style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0, marginTop: open ? 0 : -8, visibility: open ? "visible" : "hidden", transition: `grid-template-rows 280ms ${EASE}, margin-top 280ms ${EASE}, opacity 220ms ease, visibility 0s linear ${open ? 0 : 280}ms`, backgroundColor: PAGE }}>
          <div style={{ minHeight: 0, overflow: "hidden", backgroundColor: PAGE }}>
              <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, backgroundColor: PAGE, color: INK, border: `1px solid ${LINE}`, borderRadius: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8, backgroundColor: PAGE }}>
                <Field label="Show">
                  <Seg options={[{ value: "intervals", label: "Intervals" }, { value: "notes", label: "Notes" }]} value={show} onChange={(v: string) => setShow(v)} />
                </Field>
                <Field label="Count from" style={{ opacity: show === "intervals" ? 1 : 0.35, pointerEvents: show === "intervals" ? "auto" : "none", transition: "opacity 200ms ease" }}>
                  <Seg options={[{ value: "0", label: `${I}9` }, { value: "4", label: `${III}ø` }, { value: "7", label: `${V}m6` }]} value={frame} onChange={(v: string) => setFrame(v)} />
                </Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center", backgroundColor: PAGE }}>
                  <Field label="" style={{ gap: 0 }}>
                    <select value={keyId} onChange={(e: ChangeEvent<HTMLSelectElement>) => { const nk = KEYS.find((x: KeyDef) => x.id === e.target.value) ?? KEYS[0]; const list = instances(nk); let best = homeIndex(list); list.forEach((q: Pos, i: number) => { if (q.p === cur.p && (list[best].p !== cur.p || Math.abs(q.lo - cur.lo) < Math.abs(list[best].lo - cur.lo))) best = i; }); setInst(best); setKeyId(e.target.value); setReveal(new Set<string>()); }} style={{ height: CH, width: "100%", boxSizing: "border-box", fontFamily: SANS, fontSize: CFS, fontWeight: 500, color: INK, backgroundColor: PAGE, border: BORDER, borderRadius: RAD, padding: "0 26px 0 12px", lineHeight: "18px", colorScheme: "only light", cursor: "pointer", backgroundImage: "linear-gradient(45deg, transparent 50%, #4d3533 50%), linear-gradient(135deg, #4d3533 50%, transparent 50%)", backgroundPosition: "calc(100% - 15px) 50%, calc(100% - 10px) 50%", backgroundSize: "5px 5px, 5px 5px", backgroundRepeat: "no-repeat" }}>
                      {KEYS.map((x: KeyDef) => <option key={x.id} value={x.id} style={{ color: INK, backgroundColor: PAGE }}>{`Key of ${x.id}`}</option>)}
                    </select>
                  </Field>
                  <Check on={lefty} label="Left-handed" onClick={() => setLefty(!lefty)} />
                </div>
              </div>
          </div>
        </div>
        {/* Shape row: pick Shape 1-5 directly (nearest position), or use the board arrows / swipe to walk the whole neck. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 28, minWidth: 0, backgroundColor: PAGE }}>
          <div role="radiogroup" aria-label="Shape" style={{ display: "flex", gap: 4, flex: "0 0 auto", backgroundColor: PAGE }}>
            {[0, 1, 2, 3, 4].map((p: number) => (
              <button key={p} type="button" role="radio" aria-checked={cur.p === p} aria-label={`Shape ${p + 1}: ${shapeName(p, k)}`} {...tipOn(`shape${p}`)} onClick={() => pickShape(p)} style={{ height: 28, width: 30, padding: 0, border: `1px solid ${cur.p === p ? INK : LINE}`, borderRadius: 8, boxShadow: "none", cursor: "pointer", fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: cur.p === p ? PAGE : INK, backgroundColor: cur.p === p ? INK : PAGE, transition: "background-color 200ms ease, color 200ms ease, border-color 200ms ease" }}>{p + 1}</button>
            ))}
          </div>
          <span id="nine-shape" data-p={cur.p + 1} data-lo={cur.lo} data-hi={cur.hi} key={`sh${cur.p}-${cur.lo}-${keyId}`} style={{ flex: 1, minWidth: 0, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: SANS, fontSize: 12, lineHeight: "16px", color: INK2, backgroundColor: PAGE, animation: "nine-in 300ms ease both" }}>
            <span style={{ color: INK, fontWeight: 600, backgroundColor: PAGE }}>{shapeName(cur.p, k)}</span>{` \u00b7 frets ${cur.lo}\u2013${cur.hi}`}
          </span>
        </div>
        <div style={{ position: "relative", backgroundColor: PAGE }} onTouchStart={(e: { touches: ArrayLike<{ clientX: number; clientY: number }> }) => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; }} onTouchEnd={(e: { changedTouches: ArrayLike<{ clientX: number; clientY: number }> }) => { const s = touchRef.current; touchRef.current = null; if (!s) return; const t = e.changedTouches[0]; const dx = t.clientX - s.x; const dy = t.clientY - s.y; if (Math.abs(dx) > 48 && Math.abs(dy) < 36) stepShape(dx < 0 ? (lefty ? -1 : 1) : (lefty ? 1 : -1)); }}>
          <Board key={`board${jump}`} k={k} shown={shown} wl={Math.max(0, Math.min(cur.lo - 1, MAXF - 6))} step={MODE_STEP[mode]} labelOf={labelOf} ringDeg={ringDeg} lefty={lefty} drop2={mode === "drop3" ? cur.drop3 : cur.drop} interactive={quiz} onHover={(key: string) => setHover(key)} onTap={(key: string) => { const s = new Set<string>(reveal); if (s.has(key)) s.delete(key); else s.add(key); setReveal(s); setHover(key); }} path={C.kind === "explore" && exMode === "practise" && pathRun > 0 ? arpPath : undefined} pathRun={pathRun} />
          {[-1, 1].map((d: number) => {
            const ok = canShape(d);
            const onLeft = lefty ? d > 0 : d < 0;
            return (
              <button key={d} type="button" className="nine-arrow" aria-label={d < 0 ? "Previous shape, down the neck" : "Next shape, up the neck"} {...tipOn(d < 0 ? "prev" : "next")} disabled={!ok} onClick={() => stepShape(d)} style={{ position: "absolute", top: "10%", height: "71%", width: 36, [onLeft ? "left" : "right"]: -16, display: "flex", alignItems: "center", justifyContent: onLeft ? "flex-start" : "flex-end", padding: "0 3px", border: 0, borderRadius: 0, boxShadow: "none", cursor: ok ? "pointer" : "default", opacity: ok ? 1 : 0.22, transition: "opacity 200ms ease", color: INK }}>
                <svg width={12} height={22} viewBox="0 0 12 22" aria-hidden="true" style={{ display: "block" }}>
                  <path d={onLeft ? "M9 3 L3 11 L9 19" : "M3 3 L9 11 L3 19"} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: INK }} />
                </svg>
              </button>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, backgroundColor: PAGE }}>
          <button type="button" className="nine-btn" style={{ ...btn(false, card === 0), height: 44, fontSize: 15 }} disabled={card === 0} onClick={() => go(card - 1)}>{"\u2190 Back"}</button>
          <button type="button" className="nine-btn nine-btn-primary" style={{ ...btn(true, false), height: 44, fontSize: 15 }} onClick={() => go(card === total - 1 ? 0 : card + 1)}>{card === total - 1 ? "Start over" : "Continue \u2192"}</button>
        </div>
      </div>
      {tip && tipText(tip.id) ? (() => {
        const below = tip.top < 44;
        return (
          <div key={tip.id} id="nine-tip" role="tooltip" ref={(el: HTMLDivElement | null) => {
            if (!el) return;
            const w = el.offsetWidth;
            const vw = document.documentElement.clientWidth;
            const l = Math.min(Math.max(8, tip.cx - w / 2), vw - 8 - w);
            el.style.left = `${Math.max(8, l)}px`;
            const c = el.firstElementChild as HTMLElement | null;
            if (c) c.style.left = `${Math.min(Math.max(10, tip.cx - l), w - 10)}px`;
          }} style={{ position: "fixed", left: 0, top: below ? tip.bottom + 8 : tip.top - 8, transform: below ? "none" : "translateY(-100%)", zIndex: 50, pointerEvents: "none", maxWidth: "calc(100vw - 16px)", boxSizing: "border-box", padding: "5px 9px", borderRadius: 8, border: `1px solid ${LINE}`, boxShadow: "0 2px 10px rgba(77,53,51,0.14)", fontFamily: SANS, fontSize: 12, lineHeight: "16px", fontWeight: 500, whiteSpace: "nowrap", color: INK, backgroundColor: PAGE, animation: "nine-in 120ms ease both" }}>
            <span aria-hidden="true" style={{ position: "absolute", left: "50%", [below ? "top" : "bottom"]: -5, width: 8, height: 8, marginLeft: -5, transform: "rotate(45deg)", backgroundColor: PAGE, borderStyle: "solid", borderColor: LINE, borderWidth: below ? "1px 0 0 1px" : "0 1px 1px 0" }} />
            {tipText(tip.id)}
          </div>
        );
      })() : null}
    </div>
  );
}
