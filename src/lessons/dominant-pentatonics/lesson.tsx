import { useState, useMemo, useEffect, useRef } from "grok/canvas";
import type { CSSProperties, ChangeEvent, ReactNode } from "grok/canvas";
import { pluck, playPhrase, stopAll, setInstrument, INSTRUMENTS } from "../../shared/audio";
import type { InstrumentId } from "../../shared/audio";
import { SITE_ROOT } from "../../shared/site-root";
import Tutorial from "../../shared/Tutorial";
import type { TutStep } from "../../shared/Tutorial";
import { KEYS, flat, titlePieces, chordify, chordChildren, titleNodes, chordSymbol, asciiName } from "../../shared/notation";
import type { ChordKind } from "../../shared/notation";
import type { KeyDef, TitlePiece } from "../../shared/notation";
import { Tabs, lockPaint } from "../../shared/ui";

type Step = 1 | 2 | 3 | 4;

interface Dot { s: number; f: number; d: number; add: boolean }
interface Pos { p: number; sh: number; octave: boolean; dots: Dot[]; lo: number; hi: number; drop: Set<string>; drop3: Set<string> }

// The sheet's palette, from the source's CSS. Painted as literals (and re-asserted as !important inline) so the page stays a white sheet on any host.
const INK = "#4d3533";
const INK2 = "#806a68";
const PAGE = "#fdfcfb";
const LINE = "#dcd5d4";
// Edges of controls need more contrast than hairlines (3:1 against the paper).
const LINE_UI = "#b9aeac";
const TEAL = "#0f766e";
const RED = "#e8372a";
const SERIF = "Aime, Georgia, serif";
// The chord name above the diagram is hand-lettered like a lead sheet: MuseJazz Text, with MuseJazz's drawn flat and sharp signs (SIL OFL, fonts/OFL-MuseJazz.txt).
const REALBOOK = "'MuseJazz Text', 'KMR Melange Grotesk', -apple-system, 'Helvetica Neue', Arial, sans-serif";
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

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const STEPS: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 10: 6 };
const SCALE = [0, 2, 4, 5, 7, 9, 10];
const PENTA = [0, 2, 4, 7, 10];
const ARP = [4, 7, 10, 2];
const GM6 = [7, 10, 2, 4];
const CHORD = [0, 4, 7, 10];


function spell(k: KeyDef, semi: number): string {
  const l = (k.letter + STEPS[semi]) % 7;
  const pc = (k.pc + semi) % 12;
  const diff = ((pc - NATURAL[l] + 18) % 12) - 6;
  const acc = diff === -2 ? "\u266d\u266d" : diff === -1 ? "\u266d" : diff === 1 ? "\u266f" : diff === 2 ? "\u266f\u266f" : "";
  return LETTERS[l] + acc;
}
// Interval name of scale degree d counted from scale degree r (both semitones above the chord root).
function ivName(d: number, r: number): string {
  const ls = (STEPS[d] - STEPS[r] + 7) % 7;
  const semis = (d - r + 12) % 12;
  const diff = ((semis - NATURAL[ls] + 18) % 12) - 6;
  const pre = diff < 0 ? "\u266d".repeat(-diff) : "\u266f".repeat(diff);
  return pre + String(ls === 1 ? 9 : ls + 1);
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
// One position, three CAGED shapes. Which CAGED form a pentatonic box is depends on the root you count from: the box's root
// notes sit on the strings of one of the five forms. The table is by shape (1-5) and frame root (the key's 1, 3 or 5) and does not
// depend on the key (checked for all 12 keys: the strings carrying the frame root inside each box always match exactly one form).
const CAGED: Record<number, string[]> = {
  0: ["A", "G", "E", "D", "C"],
  4: ["D", "C", "A", "G", "E"],
  7: ["E", "D", "C", "A", "G"],
};

interface Look { fill: string; stroke: string; sw: number; dashed: boolean; text: string; dotOp: number; textOp: number }

function look(dot: Dot, step: Step, drop2: Set<string>, ringDeg: number, plain9: boolean, ghostRoot: boolean): Look {
  const L: Look = { fill: INK, stroke: INK, sw: 0, dashed: false, text: PAGE, dotOp: 1, textOp: 1 };
  if (dot.d === ringDeg) { L.fill = PAGE; L.stroke = INK; L.text = INK; L.sw = 2.5; }
  else if (!plain9 && dot.d === 2 && step >= 2 && step <= 3) { L.fill = TEAL; L.stroke = TEAL; L.text = "#ffffff"; }
  if (step === 4) {
    if (drop2.has(`${dot.s}-${dot.f}`)) { const c = plain9 ? INK : TEAL; L.fill = c; L.stroke = c; L.text = "#ffffff"; L.sw = 0; L.dashed = false; }
    else { L.dotOp = 0.18; L.textOp = 0.35; }
  }
  // The root of the active frame is always a filled red R.
  if (dot.d === ringDeg) { L.fill = RED; L.stroke = RED; L.text = "#ffffff"; L.sw = 0; L.dashed = false; }
  // A rootless chord shows where its root would be: the same red, but a dashed ring with nothing inside.
  if (ghostRoot && dot.d === 0) { L.fill = PAGE; L.stroke = RED; L.text = RED; L.sw = 2.2; L.dashed = true; L.dotOp = 1; L.textOp = 1; }
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
  // Explore draws the 9 like any other note; the guided steps colour it teal.
  plain9?: boolean;
  // The root is left out of this chord: draw it as a dashed red ring.
  ghostRoot?: boolean;
  // Full neck: frets 0-24 at once in the same viewBox, smaller dots, the current shape on a faint band.
  full?: boolean;
  band?: [number, number];
  // Scroll: the whole neck (frets 0-24) at the zoom view's dot size inside a horizontally scrolling box,
  // re-centred on `center` (the shape's middle fret) whenever the shape changes.
  scroll?: boolean;
  center?: number;
  // Tap a lit dot to hear it.
  onPlay?: (s: number, f: number) => void;
  // Scroll mode: called with the fret at the centre of the box once the player stops scrolling by hand.
  onSettle?: (fret: number) => void;
  // Guided steps: dots (by "string-fret") to fade back so the lit ones stand out.
  dim?: Set<string>;
  // Spotlight: a degree whose dots stay lit while every other dot goes nearly dark.
  spot?: number | null;
}

// The zoom view's viewBox width: string labels (26) + 7 frets (322) + margin (8). Scroll mode keeps this scale.
const ZOOM_W = 356;

const FULL_MARKS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
// The fret numbers drawn under the neck: just the inlay frets.
const FRET_LABELS = [3, 5, 7, 9, 12, 15, 17, 19, 21];

function Board(props: BoardProps) {
  const { k, shown, wl, step, labelOf, ringDeg, lefty, drop2, plain9, ghostRoot, full, band, scroll, center, onPlay, onSettle, dim, spot } = props;
  const scRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<boolean>(true);
  const progAt = useRef<number>(0);
  const sg = 28;
  const lab = 26;
  const top = 20;
  // Zoom shows a 7-fret window; the full neck fits all 24 frets plus the open-string column in that same 322-unit width,
  // so the board's width and height (and the layout around it) never change.
  const VW7 = 7 * 46;
  const openW = full ? 14 : 32;
  const cw = full ? (VW7 - openW) / MAXF : 46;
  const r = full ? 6.3 : 11.5;
  // Scroll mode draws the whole neck at zoom size; the scroll box (below) shows a ZOOM_W-wide slice of it.
  const VW = scroll ? openW + MAXF * cw : VW7;
  const W = lab + VW + 8;
  // Room below the low E: dot edge (r 11.5) + ~12px gap + fret-number row.
  const H = top + 5 * sg + 38;
  const gx = (f: number): number => { const x = f === 0 ? -openW / 2 : (f - 0.5) * cw; return lefty ? -x : x; };
  const lx = (x: number): number => (lefty ? -x : x);
  const Y = (s: number): number => top + (5 - s) * sg;
  const vs = full || scroll || wl === 0 ? -openW : (wl - 1) * cw;
  const left = lefty ? 8 : lab;
  const tx = lefty ? left + vs + VW : left - vs;
  const fs = full ? 7.5 : 11.5;
  const bandA = band ? gx(band[0]) - (lefty ? -cw / 2 : cw / 2) : 0;
  const bandB = band ? gx(band[1]) + (lefty ? -cw / 2 : cw / 2) : 0;
  const bandX = Math.min(bandA, bandB);
  const bandW = Math.abs(bandB - bandA);

  const rank = new Map<string, number>();
  [...shown].sort((a: Dot, b: Dot) => pitch(a) - pitch(b)).forEach((d: Dot, i: number) => rank.set(`${d.s}-${d.f}`, i));
  const all: Dot[] = [];
  for (let s = 0; s < 6; s++) for (let f = 0; f <= MAXF; f++) { const d = degOf(s, f, k); if (SCALE.includes(d)) all.push({ s, f, d, add: d === 5 || d === 9 }); }
  const frets = Array.from({ length: MAXF }, (_: unknown, i: number) => i + 1);
  const midY = (Y(2) + Y(3)) / 2;
  const tr = (ms: number): string => `opacity ${ms}ms ease, fill ${ms}ms ease, stroke ${ms}ms ease`;

  // Scroll mode: centre the shape in the scroll box. The first placement (mount, including a wrap) is instant; later ones glide.
  useEffect(() => {
    const el = scRef.current;
    if (!scroll || !el || center === undefined) return;
    const unit = el.clientWidth / ZOOM_W;
    const target = (tx + gx(center)) * unit - el.clientWidth / 2;
    progAt.current = performance.now();
    el.scrollTo({ left: Math.max(0, target), behavior: firstRef.current ? "auto" : "smooth" });
    firstRef.current = false;
  }, [scroll, center, lefty, k.id]);

  // When the player scrolls by hand and stops, the shape nearest the middle becomes the current one, so the Shape bar,
  // the legend and the lit dots always describe what is on screen. Scrolls we started ourselves are ignored.
  useEffect(() => {
    const el = scRef.current;
    if (!scroll || !el || !onSettle) return;
    let t = 0;
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        if (performance.now() - progAt.current < 1000) return;
        const unit = el.clientWidth / ZOOM_W;
        const x = (el.scrollLeft + el.clientWidth / 2) / unit - tx;
        onSettle(lefty ? -x / cw + 0.5 : x / cw + 0.5);
      }, 140);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); window.clearTimeout(t); };
  });

  const board = (
    <svg id="nine-board" viewBox={`0 0 ${W} ${H}`} width={scroll ? `${(W / ZOOM_W) * 100}%` : "100%"} style={{ display: "block", maxWidth: scroll ? "none" : "100%", height: "auto", fontFamily: SANS, overflow: "hidden", backgroundColor: PAGE, animation: "nine-in 300ms ease both" }} role="img" aria-label={`Fretboard from fret ${wl}`}>
      <defs><clipPath id="nine-clip"><rect x={left - 2} y={0} width={VW + 4} height={H} /></clipPath></defs>
      {[0, 1, 2, 3, 4, 5].map((s: number) => (
        <text key={`sn${s}`} x={lefty ? left + VW + 8 : lab - 8} y={Y(s) + 4} textAnchor={lefty ? "start" : "end"} fontSize={11} style={{ fill: INK2 }}>{STR_NAMES[s]}</text>
      ))}
      <g clipPath="url(#nine-clip)">
        <g style={{ transform: `translate(${tx}px, 0px)`, transition: `transform 560ms ${EASE}` }}>
          {band ? <rect data-band="1" x={bandX} y={Y(5) - 16} width={bandW} height={5 * sg + 32} rx={6} style={{ fill: TEAL, opacity: 0.1, transition: `x 560ms ${EASE}, width 560ms ${EASE}` }} /> : null}
          {[3, 5, 7, 9, 15, 17, 19, 21].map((f: number) => <circle key={`i${f}`} cx={gx(f)} cy={midY} r={full ? 3 : 5} style={{ fill: INK2 }} opacity={0.22} />)}
          {[12, 24].map((f: number) => (
            <g key={`ii${f}`}>
              <circle cx={gx(f)} cy={(Y(3) + Y(4)) / 2} r={full ? 3 : 5} style={{ fill: INK2 }} opacity={0.22} />
              <circle cx={gx(f)} cy={(Y(1) + Y(2)) / 2} r={full ? 3 : 5} style={{ fill: INK2 }} opacity={0.22} />
            </g>
          ))}
          {frets.map((f: number) => <line key={`f${f}`} x1={lx(f * cw)} x2={lx(f * cw)} y1={Y(5)} y2={Y(0)} style={{ stroke: INK2 }} strokeWidth={1.2} opacity={0.55} />)}
          {[0, 1, 2, 3, 4, 5].map((s: number) => <line key={`s${s}`} x1={lx(-openW)} x2={lx(MAXF * cw)} y1={Y(s)} y2={Y(s)} style={{ stroke: INK }} strokeWidth={1} opacity={0.5} />)}
          <line x1={0} x2={0} y1={Y(5) - 0.5} y2={Y(0) + 0.5} style={{ stroke: INK }} strokeWidth={5} />
          {frets.filter((f: number) => FRET_LABELS.includes(f)).map((f: number) => <text key={`n${f}`} x={gx(f)} y={Y(0) + 32} textAnchor="middle" fontSize={full ? 9.5 : 11} style={{ fill: INK2 }}>{f}</text>)}
          {all.map((dot: Dot) => {
            const key = `${dot.s}-${dot.f}`;
            const rk = rank.get(key);
            const vis = rk !== undefined;
            const L = look(dot, step, drop2, ringDeg, !!plain9, !!ghostRoot);
            if (dim && dim.has(key)) { L.dotOp = 0.16; L.textOp = 0.3; }
            if (spot !== undefined && spot !== null) { if (dot.d === spot) { L.dotOp = 1; L.textOp = 1; if (!dot.add) { const col = dot.d === ringDeg ? RED : dot.d === 2 ? TEAL : INK; L.fill = col; L.stroke = col; L.text = "#ffffff"; L.sw = 0; L.dashed = false; } } else { L.dotOp = 0.07; L.textOp = 0.12; } }
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
              pointerEvents: vis && onPlay ? "auto" : "none",
              cursor: onPlay ? "pointer" : undefined,
            };
            return (
              <g key={key} data-s={dot.s} data-f={dot.f} data-vis={vis ? 1 : 0} style={gStyle} onClick={(e: { currentTarget: SVGGElement }) => {
                if (!onPlay) return;
                onPlay(dot.s, dot.f);
                // A short pulse on the tapped dot, as a tap acknowledgement.
                const c = e.currentTarget.querySelector("circle");
                if (c && c.animate) c.animate([{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 220, easing: "ease-out" });
              }}>
                <circle cx={cx} cy={cy} r={r} strokeDasharray={L.dashed ? "3 2.4" : undefined} style={{ fill: L.fill, stroke: L.stroke, strokeWidth: L.sw, opacity: L.dotOp, transition: tr(320), transformBox: "fill-box", transformOrigin: "center" }} />
                <text key={label} x={cx} y={cy + size * 0.36} textAnchor="middle" fontSize={size} fontWeight={600} style={{ fill: L.text, opacity: label ? L.textOp : 0, transition: tr(240), animation: "nine-lbl 280ms ease both" }}>{label}</text>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
  if (!scroll) return board;
  // Scrolling neck: native horizontal scroll over the wide board, with the string names pinned over the left edge.
  const pinLeft = !lefty;
  return (
    <div style={{ position: "relative", backgroundColor: PAGE }}>
      <div ref={scRef} id="nine-scroll" style={{ overflowX: "auto", overflowY: "hidden", overscrollBehaviorX: "contain", scrollbarWidth: "none", backgroundColor: PAGE }}>{board}</div>
      <svg aria-hidden="true" viewBox={`0 0 ${lab} ${H}`} style={{ position: "absolute", top: 0, [pinLeft ? "left" : "right"]: 0, width: `${(lab / ZOOM_W) * 100}%`, height: "auto", pointerEvents: "none", backgroundColor: PAGE }}>
        <rect x={0} y={0} width={lab} height={H} style={{ fill: PAGE }} />
        {[0, 1, 2, 3, 4, 5].map((s: number) => (
          <text key={`pn${s}`} x={pinLeft ? lab - 8 : 8} y={Y(s) + 4} textAnchor={pinLeft ? "end" : "start"} fontSize={11} style={{ fill: INK2 }}>{STR_NAMES[s]}</text>
        ))}
      </svg>
    </div>
  );
}

// Segmented control: equal segments with a filled indicator that slides to the selected one.
function Seg(props: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; disabled?: boolean; weights?: number[]; className?: string }) {
  const { options, value, onChange, disabled } = props;
  const n = options.length;
  const i = Math.max(0, options.findIndex((o: { value: string; label: string }) => o.value === value));
  // Optional column weights let longer labels take more room; the indicator follows them.
  const w = props.weights && props.weights.length === n ? props.weights : options.map(() => 1);
  const sum = w.reduce((a: number, b: number) => a + b, 0);
  const before = w.slice(0, i).reduce((a: number, b: number) => a + b, 0);
  return (
    <div role="radiogroup" className={`nine-seg${props.className ? ` ${props.className}` : ""}`} style={{ position: "relative", display: "grid", gridTemplateColumns: w.map((x: number) => `minmax(0, ${x}fr)`).join(" "), height: CH, border: BORDER, borderRadius: RAD, overflow: "hidden", backgroundColor: PAGE, color: INK, boxSizing: "border-box", width: "100%" }}>
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
  { mode: "penta", kind: "c7" },
  { mode: "penta", kind: "lose" },
  { mode: "penta", kind: "nine" },
  { mode: "penta", kind: "names" },
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
// Third chip: "Synonyms" on a phone, "Chord Synonyms" once there is room (CSS swaps the two spans).
const STEP_LABEL = ["C7", "Rootless", "The 9", "Synonyms", "Pentatonic", "Mixolydian", "Drop", "Explore"];
const STEP_LONG: Record<number, string> = { 3: "Chord Synonyms", 6: "Drop Voicings" };
// The guided steps: each makes one statement on one fixed position (Shape 1), dims every note that is not part of it and lights the ones that are.
const GUIDED = new Set<string>(["c7", "lose", "nine", "names", "penta", "mixo", "voicing"]);
// Each guided step is a few beats. A beat says one thing: it lights the notes that sentence is about and dims everything else
// (the other notes, the page around the board). `lit` is a list of degrees, or "penta" (the pentatonic notes), or a Drop voicing.
type Lit = number[] | "penta" | "drop2" | "drop3";
interface BeatSpec { lit: Lit; ring?: number; mode?: Mode; step: Step }
const BEAT_SPEC: Record<string, BeatSpec[]> = {
  c7: [{ lit: CHORD, step: 1 }, { lit: [0], step: 1 }, { lit: [4, 7, 10], step: 1 }],
  lose: [{ lit: [4, 7, 10], step: 1 }, { lit: [4, 7, 10], step: 1 }],
  nine: [{ lit: [2], step: 2 }, { lit: ARP, step: 2 }, { lit: ARP, step: 2 }, { lit: ARP, step: 2 }],
  names: [{ lit: ARP, ring: 4, step: 2 }, { lit: ARP, ring: 7, step: 2 }, { lit: ARP, ring: 0, step: 2 }],
  penta: [{ lit: ARP, step: 2 }, { lit: "penta", step: 2 }, { lit: ARP, step: 2 }],
  mixo: [{ lit: ARP, step: 3 }, { lit: "penta", step: 3 }, { lit: [5, 9], step: 3 }, { lit: [5, 4], step: 3 }, { lit: [10, 4, 2], step: 3 }, { lit: [9, 5, 0], ring: 5, step: 3 }],
  voicing: [{ lit: "drop2", mode: "grip", step: 4 }, { lit: "drop3", mode: "drop3", step: 4 }, { lit: ARP, mode: "arp", step: 2 }],
};
function homeIndex(list: Pos[]): number {
  const i = list.findIndex((q: Pos) => q.p === 0 && q.lo >= 1);
  return i >= 0 ? i : 0;
}

// The first-time tour: each step lights one control (CSS selector) on the card it lives on (`at` = card, beat).
const TUT_SEEN = "agt-dominant-pentatonics-tutorial-seen";
const TUT_STEPS: TutStep[] = [
  { at: [0, 0], live: true, sel: "#nine-scroll, #nine-board", title: "The fretboard", text: "Six strings and seven frets at a time. Every dot is a note of the chord or scale. Tap any dot to hear it." },
  { at: [0, 0], live: true, sel: ".nine-card p", title: "One idea at a time", text: "Read one sentence at a time. Every note and interval in the text is a circle, like the dots on the board. Tap one to spotlight that note on the board and hear it." },
  { at: [0, 0], live: true, sel: "#nine-hear", title: "Hear it", text: "Plays what is lit on the board, so you hear exactly what the sentence is about." },
  { at: [0, 0], live: true, sel: "#nine-show", title: "Intervals or Notes", text: "Switch the dot labels between intervals ([R] [3] [5] [\u266d7]) and note names. The root is always red." },
  { at: [0, 0], live: true, settings: true, sel: 'button[aria-label="Display settings"]', also: "#nine-settings", title: "Settings", text: "Key, Left-handed, Sound, Neck, Show tutorial and Share image live here." },
  { at: [0, 0], sel: 'nav[aria-label="Lesson steps"]', title: "The steps", text: "The lesson has eight steps. Tap any one to jump straight to it." },
  { at: [0, 0], sel: "#nine-nav", title: "Back and Continue", text: "Walk through the beats with Continue and Back. The left and right arrow keys work too." },
  { at: [2, 2], sel: ".nine-card p button[aria-pressed]", title: "Chord names are buttons", text: "A chord name with a dotted underline is a button. Tap it to count the board's intervals from that chord, and tap it again to go back." },
  { at: [7, 0], live: true, sel: "#nine-shape", title: "Explore: the five shapes", text: "The last step opens the whole neck. Pick one of the five shapes. The \u2212 and + under the board\u2019s arrows move it an octave down or up." },
  { at: [7, 0], live: true, sel: "#nine-scroll, #nine-board", title: "Walk the neck", text: "Swipe or scroll the neck, or use the arrows at its edges, to move up and down the shapes." },
  { at: [7, 0], live: true, sel: "#nine-labels", title: "Label the dots", text: "On the chord layers, the tabs pick which chord the notes belong to: the rootless dominant 9, the half-diminished or the minor 6 (same notes, three names). The small switch at the right shows note names or intervals counted from that chord." },
  { at: [7, 0], live: true, sel: "#nine-name", title: "What you are looking at", text: "The chord, or the scale on the Pentatonic and Mixolydian layers. A Drop voicing adds its name underneath. The arrow at the right shares the diagram as an image." },
  { at: [7, 0], live: true, sel: "#nine-play", title: "Play", text: "Plays the notes of the shape from low to high. Tap again to stop." },
];

// Injected by build.mjs from lesson.json ("helps to know": background that helps but is not required).
interface Helpful { topic: string; why: string; href: string | null }
declare const __HELPFUL__: Helpful[];
const HELPFUL: Helpful[] = __HELPFUL__;

// Where you are lives in the address (#s4b2 = step 4, part 2), so a refresh, or a link, comes back to the same place.
function readSpot(): { card: number; beat: number } {
  const m = /^#s(\d+)(?:b(\d+))?$/.exec(window.location.hash);
  if (!m) return { card: 0, beat: 0 };
  const card = Number(m[1]) - 1;
  if (!(card >= 0 && card < CARDS.length)) return { card: 0, beat: 0 };
  const n = GUIDED.has(CARDS[card].kind) ? BEAT_SPEC[CARDS[card].kind].length : 1;
  const beat = Number(m[2] ?? 1) - 1;
  return { card, beat: beat >= 0 && beat < n ? beat : 0 };
}

export default function App() {
  const [card, setCard] = useState<number>(() => readSpot().card);
  const [beat, setBeat] = useState<number>(() => readSpot().beat);
  const [dir, setDir] = useState<number>(1);
  const [keyId, setKeyId] = useState<string>("C");
  const [show, setShow] = useState<string>("intervals");
  const [frame, setFrame] = useState<string>("0");
  const [lefty, setLefty] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [tut, setTut] = useState<boolean>(false);
  const tutFrom = useRef<{ card: number; beat: number }>({ card: 0, beat: 0 });
  const beatRef = useRef<number>(0);
  const openRef = useRef<boolean>(false);
  const [layerMode, setLayerMode] = useState<string>("penta");
  const [inst, setInst] = useState<number>(-1);
  const [jump, setJump] = useState<number>(0);
  const [full, setFull] = useState<boolean>(false);
  const [sound, setSound] = useState<InstrumentId>("nylon");
  const [playing, setPlaying] = useState<boolean>(false);
  // Spotlight: tapping a note name in a statement dims the whole page except that note (a degree 0-11), for a moment.
  const [spot, setSpot] = useState<number | null>(null);
  const spotTimer = useRef<number>(0);
  const [tip, setTip] = useState<{ id: string; cx: number; top: number; bottom: number } | null>(null);
  const pressRef = useRef<{ t: number; shown: boolean }>({ t: 0, shown: false });
  useEffect(() => {
    const h = () => setTip(null);
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, []);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const total = CARDS.length;
  const go = (i: number, b = 0) => {
    const t = Math.max(0, Math.min(total - 1, i));
    setCard((c: number) => { setDir(t >= c ? 1 : -1); return t; });
    setBeat(b);
    setFrame("0"); // the count-from lens belongs to the screen it was chosen on
  };
  useEffect(() => {
    try { window.history.replaceState(null, "", `#s${card + 1}${beat > 0 ? `b${beat + 1}` : ""}`); } catch { /* a sandboxed frame may not allow it; the lesson still works */ }
  }, [card, beat]);
  // Editing the address by hand, or following a link to another step of the same page, moves the lesson there too.
  useEffect(() => {
    const onHash = (): void => { const sp = readSpot(); setCard(sp.card); setBeat(sp.beat); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const cardRef = useRef<number>(0);
  cardRef.current = card;
  beatRef.current = beat;
  openRef.current = open;
  const frameRef = useRef<string>("0");
  frameRef.current = frame;
  const navRef = useRef<{ next: () => void; prev: () => void; key: (d: number) => void }>({ next: () => {}, prev: () => {}, key: () => {} });
  const startTutorial = (): void => { tutFrom.current = { card: cardRef.current, beat }; setOpen(false); setTut(true); };
  const endTutorial = (): void => {
    setTut(false);
    setOpen(false);
    try { window.localStorage.setItem(TUT_SEEN, "1"); } catch { /* private mode: the tour just offers itself again */ }
    go(tutFrom.current.card, tutFrom.current.beat);
  };
  // First visit: open the tour once (never under automation, so the tests stay clear of it).
  useEffect(() => {
    let seen = false;
    try { seen = window.localStorage.getItem(TUT_SEEN) === "1"; } catch { seen = false; }
    if (seen || navigator.webdriver) return;
    const t = window.setTimeout(() => setTut(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "SELECT" || t.tagName === "INPUT" || t.getAttribute("role") === "radio" || t.getAttribute("role") === "checkbox")) return;
      if (e.key === "ArrowRight") navRef.current.key(1);
      if (e.key === "ArrowLeft") navRef.current.key(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Runs after every render: keeps the sheet's paint locked against host and theme styles.
  useEffect(() => { if (rootRef.current) lockPaint(rootRef.current); });

  const k: KeyDef = KEYS.find((x: KeyDef) => x.id === keyId) ?? KEYS[0];
  const seq: Pos[] = useMemo(() => instances(k), [keyId]);
  const C = CARDS[card];
  const guided = GUIDED.has(C.kind);
  const shapeIdx = guided ? homeIndex(seq) : inst >= 0 && inst < seq.length ? inst : homeIndex(seq);
  // Board arrows and swipe step through every shape instance on the neck, on every card, and the position persists.
  // The arrows stop at the nut and at the top of the neck (no wrap-around): Shape buttons and the octave step do the long moves.
  const canShape = (d: number): boolean => { const t = shapeIdx + d; return d !== 0 && t >= 0 && t < seq.length; };
  const stepShape = (d: number): void => {
    if (guided || !canShape(d)) return;
    setInst(shapeIdx + d);
  };
  // The same shape one octave up or down (from the highest copy up to the lowest and back, with a fade because the board jumps). Open-string
  // shapes at the nut have a moveable twin at the 12th fret; this is how you get between them.
  const copies: number[] = seq.map((q: Pos, i: number) => (q.p === seq[shapeIdx].p ? i : -1)).filter((i: number) => i >= 0);
  const canOctave = copies.length > 1;
  const octaveShape = (dir: number = 1): void => {
    if (!canOctave) return;
    const lo = seq[shapeIdx].lo;
    const nextIdx = dir > 0
      ? (copies.find((i: number) => seq[i].lo > lo) ?? copies[0])
      : ([...copies].reverse().find((i: number) => seq[i].lo < lo) ?? copies[copies.length - 1]);
    setJump((j: number) => j + 1);
    setInst(nextIdx);
  };
  // Direct shape pick: the same shape number nearest the current position, so the board barely moves.
  const pickShape = (p: number): void => {
    let best = -1;
    seq.forEach((q: Pos, i: number) => { if (q.p === p && (best < 0 || Math.abs(q.lo - seq[shapeIdx].lo) < Math.abs(seq[best].lo - seq[shapeIdx].lo))) best = i; });
    if (best === shapeIdx) { octaveShape(1); return; } // tapping the shape you are on moves it an octave
    if (best < 0) return;
    setInst(best);
  };
  const cur = seq[shapeIdx];
  const bt: BeatSpec | null = guided ? BEAT_SPEC[C.kind][Math.min(beat, BEAT_SPEC[C.kind].length - 1)] : null;
  const nBeats = guided ? BEAT_SPEC[C.kind].length : 1;
  const mode: Mode = bt && bt.mode ? bt.mode : C.kind === "explore" ? (layerMode as Mode) : (C.mode as Mode);
  // Explore shows a scrolling neck (full-size dots, shape centred) or, when asked, the whole neck fitted to the screen.
  const onExplore = C.kind === "explore";
  const fullOn = full && onExplore;
  const scrollOn = onExplore && !full;
  // One global label mode: every dot on every card follows Show (Intervals / Notes).
  const intervals = show === "intervals";
  // One global Count-from frame for every card; a guided beat can read the notes from another root (the Chord Synonyms beats do).
  const eff = bt && bt.ring !== undefined ? bt.ring : Number(frame);
  const ringDeg = eff;
  const iv = (d: number): string => ivName(d, eff);
  const n = (d: number): string => spell(k, d);
  const I = n(0);
  const cs = (r: string, kind: ChordKind): string => chordSymbol(r, kind);
  const III = n(4);
  const V = n(7);
  const notes = (ds: number[]): string => ds.map(n).join(" ");
  const ivs = (ds: number[]): string => ds.map(iv).join(" ");

  // Rootless: the arpeggio and the Drop voicings (and the guided beats after the root is dropped), counted from the root, draw the missing root as a dashed red ring.
  const ghostRoot = eff === 0 && C.kind !== "c7" && (mode === "arp" || mode === "grip" || mode === "drop3" || (C.kind === "lose" && beat >= 1));
  const base = modeDots(cur.dots, mode);
  const shown = (ghostRoot && !base.some((d: Dot) => d.d === 0) ? [...base, ...cur.dots.filter((d: Dot) => d.d === 0 && !d.add)] : base).filter((d: Dot) => !(C.kind === "c7" && d.d === 2)); // the 9 is not part of C7: it is not drawn on that step
  // Guided beats: the notes the sentence is about stay lit; every other note of the position is dimmed.
  const isLit = (d: Dot): boolean => {
    if (!bt) return true;
    if (ghostRoot && d.d === 0) return true; // the dashed root ring is never dimmed
    const l = bt.lit;
    if (l === "penta") return !d.add;
    if (l === "drop2") return cur.drop.has(`${d.s}-${d.f}`);
    if (l === "drop3") return cur.drop3.has(`${d.s}-${d.f}`);
    return l.includes(d.d);
  };
  const dimSet: Set<string> | undefined = bt ? new Set<string>(shown.filter((d: Dot) => !isLit(d)).map((d: Dot) => `${d.s}-${d.f}`)) : undefined;
  // Sound: tap a lit dot to hear it; the play button plays what is on the board, notes ascending or the chord strummed.
  const playDot = (s: number, f: number): void => { void pluck(OPEN_MIDI[s] + f, 0.8); };
  // After a hand scroll on the Explore neck, the shape nearest the middle becomes current (with a little bias towards staying put).
  const settleScroll = (fret: number): void => {
    const mid = (q: Pos): number => (q.lo + q.hi) / 2;
    let best = shapeIdx;
    let bd = Math.abs(mid(seq[shapeIdx]) - fret) - 0.5;
    seq.forEach((q: Pos, i: number) => { const d = Math.abs(mid(q) - fret); if (d < bd) { bd = d; best = i; } });
    if (best !== shapeIdx) setInst(best);
  };
  // Emphasise every lit dot that sounds this pitch (used while a phrase plays; a tap pulses its own dot).
  const pulseMidi = (m: number): void => {
    document.querySelectorAll('#nine-board g[data-vis="1"]').forEach((g: Element) => {
      if (OPEN_MIDI[Number(g.getAttribute("data-s"))] + Number(g.getAttribute("data-f")) !== m) return;
      const c = g.querySelector("circle");
      if (c && c.animate) c.animate([{ transform: "scale(1)" }, { transform: "scale(1.45)" }, { transform: "scale(1)" }], { duration: 300, easing: "ease-out" });
    });
  };
  // The play button turns into a stop button while a phrase is sounding.
  const playShown = (): void => {
    if (playing) { stopAll(); setPlaying(false); return; }
    const set = mode === "grip" ? cur.drop : mode === "drop3" ? cur.drop3 : null;
    const midis = set
      ? [...set].map((key: string) => { const [s, f] = key.split("-").map(Number); return OPEN_MIDI[s] + f; })
      : shown.filter((d: Dot) => !(dimSet && dimSet.has(`${d.s}-${d.f}`)) && !(ghostRoot && d.d === 0)).map((d: Dot) => OPEN_MIDI[d.s] + d.f);
    setPlaying(true);
    void playPhrase({ notes: midis, style: set ? "strum" : "arpeggio", onNote: pulseMidi }).then(() => setPlaying(false));
  };
  // Anything that changes what is on the board silences a phrase that is still playing.
  useEffect(() => { stopAll(); setPlaying(false); window.clearTimeout(spotTimer.current); setSpot(null); }, [card, beat, shapeIdx, keyId, layerMode, frame, show]);
  const labelOf = (d: Dot): string => {
    if (!intervals) return n(d.d);
    return d.d === eff ? "R" : iv(d.d);
  };
  const dropNotes: number[] = DROP2[cur.p].map((sf: number[]) => degOf(sf[0], sf[1] + cur.sh, k));
  // Name a voicing as an inversion of the Count-from chord: slash the actual lowest note unless it is that chord's root.
  const nameFrame = eff;
  const vname = (set: Set<string>): string => {
    const ds = [...set].map((key: string) => { const [s, f] = key.split("-").map(Number); return { s, f, d: degOf(s, f, k), add: false }; });
    const bass = ds.reduce((a: Dot, b: Dot) => (pitch(b) < pitch(a) ? b : a));
    const base = nameFrame === 0 ? `${cs(I, "dom9")}` : nameFrame === 4 ? `${cs(III, "hdim")}` : `${cs(V, "m6")}`;
    if (nameFrame === 0) return `${cs(I, "dom9")} Rootless`;
    return bass.d === nameFrame ? base : `${base}/${n(bass.d)}`;
  };
  const shapeLabel = (q: Pos): string => `Shape ${q.p + 1}`;

  const scaleLayer = layerMode === "penta" || layerMode === "mixo";
  const layerSeg = () => tabsBtn("Layer", [{ value: "arp", label: "Arpeggio" }, { value: "penta", label: "Pentatonic" }, { value: "mixo", label: "Mixolydian" }, { value: "grip", label: "Drop 2" }, { value: "drop3", label: "Drop 3" }], layerMode, (v: string) => { setLayerMode(v); if (v === "penta" || v === "mixo") setFrame("0"); }, [9, 10, 10, 7, 7], "nine-layers");

  const tabsBtn = (label: string, o: { value: string; label: string }[], v: string, on: (x: string) => void, weights?: number[], className?: string, wrap?: boolean, size?: number, height?: number) => <Tabs label={label} options={o} value={v} onChange={on} weights={weights} className={className} wrap={wrap} size={size} height={height} />;
  const segBtn = (o: { value: string; label: string }[], v: string, on: (x: string) => void, weights?: number[], className?: string) => <Seg options={o} value={v} onChange={on} weights={weights} className={className} />;
  const ink = spot !== null ? "rgba(77,53,51,0.2)" : INK;
  const head = (t: string, extra?: string) => (
    <h2 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 400, lineHeight: "26px", letterSpacing: "-0.4px", color: ink, transition: "color 260ms ease", backgroundColor: PAGE, margin: 0 }}>
      {chordify(t)}{extra ? <span style={{ fontFamily: SANS, fontSize: 12.5, color: INK2, backgroundColor: PAGE, letterSpacing: 0, marginLeft: 8 }}>{extra}</span> : null}
    </h2>
  );
  const line = (t: ReactNode) => <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 350, lineHeight: "20px", letterSpacing: "-0.14px", color: ink, transition: "color 260ms ease", backgroundColor: PAGE, margin: 0 }}>{t}</p>;
  // A note name in a statement is a small bold dot coloured like the board's dots (root red, the 9 teal, the rest ink).
  // Tapping it lights every dot of that note on the board, dimmed or not, and plays the lowest one.
  const noteTap = (deg: number): void => {
    let lowest = -1;
    setSpot(deg);
    window.clearTimeout(spotTimer.current);
    spotTimer.current = window.setTimeout(() => setSpot(null), 1500);
    document.querySelectorAll('#nine-board g[data-vis="1"]').forEach((g: Element) => {
      const s = Number(g.getAttribute("data-s"));
      const f = Number(g.getAttribute("data-f"));
      if (degOf(s, f, k) !== deg) return;
      const midi = OPEN_MIDI[s] + f;
      if (lowest < 0 || midi < lowest) lowest = midi;
      const c = g.querySelector("circle");
      if (c && c.animate) c.animate([{ offset: 0.3, opacity: 1, transform: "scale(1.55)" }, { offset: 0.7, opacity: 1, transform: "scale(1.55)" }, { offset: 1 }], { duration: 1100, easing: "ease-in-out" });
    });
    if (lowest >= 0) void pluck(lowest, 0.8);
  };
  const chip = (deg: number, ring: number = eff, label?: string): ReactNode => {
    const bg = deg === ring ? RED : deg === 2 ? TEAL : INK;
    return (
      <button key={`chip${deg}`} type="button" className="nine-note" aria-label={`Show ${n(deg)} on the board`} onClick={() => noteTap(deg)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 22, height: 22, padding: "0 6px", margin: "0 1px", boxSizing: "border-box", verticalAlign: "baseline", border: 0, borderRadius: 11, cursor: "pointer", fontFamily: SANS, fontSize: 12, fontWeight: 700, lineHeight: "22px", letterSpacing: 0, color: "#ffffff", backgroundColor: bg }}>{label ?? n(deg)}</button>
    );
  };
  // The same dot showing the interval (3, 5, b7) instead of the note name; tapping it still lights that note.
  const ivChips = (ds: number[]): ReactNode => ds.map((d: number, i: number) => <span key={`ic${d}`}>{i > 0 ? " " : ""}{chip(d, eff, d === eff ? "R" : iv(d))}</span>);
  // Chord names in running text are bold, so they read as names and not as ordinary words.
  // "a" or "an" for the note name that follows (an A, an E, an F; a C, a G...).
  const an = (note: string): string => (["A", "E", "F"].includes(note[0]) ? "an" : "a");
  const B = (props: { children: ReactNode }): ReactNode => <strong style={{ fontWeight: 700 }}>{chordChildren(props.children)}</strong>;
  // A chord name that is a synonym of the others is a button: tap it to count the board's intervals from that chord's root (tap again to go back to the root).
  const Syn = (props: { d: number; children: ReactNode }): ReactNode => {
    const on = frame === String(props.d);
    return (
      <button type="button" aria-pressed={on} aria-label={`Show the intervals from ${n(props.d)}`} onClick={() => { setShow("intervals"); setFrame(on && props.d !== 0 ? "0" : String(props.d)); }} style={{ display: "inline", padding: "0 3px", margin: 0, border: 0, borderRadius: 6, boxShadow: "none", cursor: "pointer", font: "inherit", fontWeight: 700, color: ink, backgroundColor: on ? "#e3d8d6" : PAGE, textDecoration: "underline dotted", textUnderlineOffset: 3 }}>{chordChildren(props.children)}</button>
    );
  };
  const chips = (ds: number[]): ReactNode => ds.map((d: number, i: number) => <span key={`cs${d}`}>{i > 0 ? " " : ""}{chip(d)}</span>);

  const next = (): void => {
    if (beat < nBeats - 1) { setDir(1); setBeat(beat + 1); setFrame("0"); } else go(card === total - 1 ? 0 : card + 1);
  };
  const prev = (): void => {
    if (beat > 0) { setDir(-1); setBeat(beat - 1); setFrame("0"); return; }
    if (card > 0) { const pk = CARDS[card - 1].kind; go(card - 1, GUIDED.has(pk) ? BEAT_SPEC[pk].length - 1 : 0); }
  };
  // Arrow keys walk the beats and steps; on Explore (the last step) they walk the shapes instead of restarting the lesson.
  navRef.current = { next, prev, key: (d: number) => { if (onExplore) stepShape(lefty ? -d : d); else if (d > 0) next(); else prev(); } };
  // The script: for every guided step a heading, and per beat one sentence and the bold chord name shown under the board.
  const beatContent = (kind: string): { head: string; beats: { text: ReactNode; name: string }[] } => {
    const dr = (set: Set<string>, label: string): string => `${vname(set)} \u00b7 ${label}`;
    switch (kind) {
      case "c7": return { head: `${cs(I, "dom7")}, the chord.`, beats: [
        { text: <><B>{cs(I, "dom7")}</B> is four notes: {chips(CHORD)}.</>, name: `${cs(I, "dom7")}` },
        { text: <>{chip(0)} is the root, the note the chord is named for: the red {ivChips([0])}.</>, name: `${cs(I, "dom7")}` },
        { text: <>{chip(4)}, {chip(7)} and {chip(10)} are the {ivChips([4, 7, 10])}. They give <B>{cs(I, "dom7")}</B> the dominant sound.</>, name: `${cs(I, "dom7")}` },
      ] };
      case "lose": return { head: "Rootless Chords.", beats: [
        { text: <>When you comp behind a soloist, the bass player usually plays the root, every {chip(0)}. So you can leave it out.</>, name: `${cs(I, "dom7")} Rootless` },
        { text: <>{chips([4, 7, 10])} are what is left, and they still say <B>{cs(I, "dom7")}</B>: the {ivChips([4, 7, 10])} carry the sound.</>, name: `${cs(I, "dom7")} Rootless` },
      ] };
      case "nine": return { head: "Add the 9.", beats: [
        { text: <>Now add one note: the {ivChips([2])}, {chip(2)}. It sits a whole step above the root, {chip(0)}.</>, name: `${n(2)}, the 9 of ${I}` },
        { text: <>{chips(ARP)}: four notes again, now with a new color.</>, name: `${cs(I, "dom9")} Rootless` },
        { text: <>These four notes, {chips(ARP)}, are <Syn d={4}>{cs(III, "hdim")}</Syn> or <Syn d={7}>{cs(V, "m6")}</Syn> or a rootless <Syn d={0}>{cs(I, "dom9")}</Syn>.</>, name: `${cs(I, "dom9")} Rootless` },
        { text: <>Try it: over <Syn d={0}>{cs(I, "dom7")}</Syn>, play {an(III)} <Syn d={4}>{cs(III, "hdim")}</Syn> or <Syn d={7}>{cs(V, "m6")}</Syn> arpeggio. Tap Hear it first, then play it yourself.</>, name: `${cs(I, "dom7")}` },
      ] };
      case "names": return { head: "Chord Synonyms.", beats: [
        { text: <>Read the same four notes from {chip(4, 4)}: {ivChips([4, 7, 10, 2])}. That is <B>{cs(III, "hdim")}</B>.</>, name: `${cs(III, "hdim")}` },
        { text: <>Read them from {chip(7, 7)}: {ivChips([7, 10, 2, 4])}. That is <B>{cs(V, "m6")}</B>.</>, name: `${cs(V, "m6")}` },
        { text: <>Over {an(I)} {chip(0, 0)} bass they are a rootless <Syn d={0}>{cs(I, "dom9")}</Syn>. Same notes, three names.</>, name: `${cs(I, "dom9")} Rootless` },
      ] };
      case "penta": return { head: "The dominant pentatonic.", beats: [
        { text: <>Start from those four notes, {chips(ARP)}.</>, name: `${cs(I, "dom9")} Rootless` },
        { text: <>Put the root back: {chips(PENTA)} is the <B>{I} dominant pentatonic</B>.</>, name: `${I} Dominant Pentatonic` },
        { text: <>Inside it hide the <Syn d={4}>{cs(III, "hdim")}</Syn> and <Syn d={7}>{cs(V, "m6")}</Syn> arpeggios you just built.</>, name: `${I} Dominant Pentatonic` },
      ] };
      case "mixo": return { head: `${I} Mixolydian.`, beats: [
        { text: <>Where it all lives: the rootless <Syn d={0}>{cs(I, "dom9")}</Syn>, <Syn d={4}>{cs(III, "hdim")}</Syn> and <Syn d={7}>{cs(V, "m6")}</Syn> notes, {chips(ARP)}, are four notes of <B>{I} Mixolydian</B>.</>, name: `${I} Mixolydian` },
        { text: <>The <B>{I} dominant pentatonic</B>, {chips(PENTA)}, is five of its seven.</>, name: `${I} Mixolydian` },
        { text: <>The other two are the {ivChips([5, 9])}, {chips([5, 9])}. {chip(9)} is the {ivChips([9])}, or {chip(9, eff, "13")}, a safe color tone over <B>{cs(I, "dom7")}</B>.</>, name: `${I} Mixolydian` },
        { text: <>{chip(5)} is the avoid note: pass through it or resolve down to {chip(4)}.</>, name: `${I} Mixolydian` },
        { text: <>Where it lands: over <B>{cs(I, "dom7")}</B> the moving notes are {chips([10, 4, 2])}.</>, name: `${cs(I, "dom7")}` },
        { text: <>Resolve to <B>{n(5)}</B>: {chip(10)} falls to {chip(9)}, {chip(4)} rises to {chip(5)}, {chip(2)} falls to {chip(0)}. Each moves one step.</>, name: `${n(5)}` },
      ] };
      default: return { head: "Play it as a chord.", beats: [
        { text: <>Play four of the notes together: Drop 2. That is <Syn d={4}>{cs(III, "hdim")}</Syn> on the top four strings, or <Syn d={0}>{cs(I, "dom9")}</Syn> without its root.</>, name: dr(cur.drop, "Drop 2") },
        { text: <>Drop 3: move the top note down to the low <B>E</B> string, for a new bass note.</>, name: dr(cur.drop3, "Drop 3") },
        { text: <>Your turn: play the <Syn d={4}>{cs(III, "hdim")}</Syn> arpeggio over <Syn d={0}>{cs(I, "dom7")}</Syn>, then land on {chip(9)} as the chord moves to <B>{n(5)}</B>.</>, name: `${cs(III, "hdim")}` },
      ] };
    }
  };
  const content = guided ? beatContent(C.kind) : null;
  const cb = content ? content.beats[Math.min(beat, content.beats.length - 1)] : null;
  const beatDots = guided ? (
    <div role="img" aria-label={`Part ${beat + 1} of ${nBeats}`} style={{ display: "flex", gap: 5, height: 8, alignItems: "center", backgroundColor: PAGE }}>
      {Array.from({ length: nBeats }, (_: unknown, i: number) => <span key={i} style={{ width: i === beat ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i <= beat ? TEAL : LINE, transition: "width 220ms ease, background-color 220ms ease" }} />)}
    </div>
  ) : null;
  let body: ReactNode = null;
  if (content && cb) body = <>{beatDots}{head(content.head)}{line(cb.text)}</>;
  else body = (
    <>{head("Explore the neck.")}<div style={{ marginTop: 4 }}>{layerSeg()}</div></>
  );

  // Share: draw the current diagram onto a 1080x1080 paper-white PNG, then hand it to the share sheet (or download it).
  const LAYER_NAME: Record<Mode, string> = { chord: "Chord tones", arp: "Arpeggio", penta: "Pentatonic", mixo: "Mixolydian", grip: "Drop 2", drop3: "Drop 3" };
  const voicing = mode === "grip" ? vname(cur.drop) : mode === "drop3" ? vname(cur.drop3) : "";
  // The bold chord name under the board.
  // Explore's name block above the board: the chord (or voicing) in big bold type; a Drop voicing adds its name underneath.
  const nameEff = show === "notes" ? 0 : eff;
  // "Rootless" because the chord layers (arpeggio, Drop voicings) leave the root out.
  const frameName = nameEff === 0 ? `${cs(I, "dom9")} Rootless` : nameEff === 4 ? `${cs(III, "hdim")}` : `${cs(V, "m6")}`;
  // The scale layers are named for the scale; the chord layers (arpeggio, Drop voicings) for the chord.
  const exTitle = mode === "grip" ? vname(cur.drop) : mode === "drop3" ? vname(cur.drop3) : mode === "penta" ? `${I} Dominant Pentatonic` : mode === "mixo" ? `${I} Mixolydian` : frameName;
  // Only a Drop 2 / Drop 3 voicing gets a second line; every other layer is just the chord, like a chord diagram.
  const exSub = mode === "grip" || mode === "drop3" ? LAYER_NAME[mode] : "";
  const caption = cb ? cb.name : `${LAYER_NAME[mode]}${voicing ? ` \u00b7 ${voicing}` : ""}`;
  // The name above the board, on every step: the chord (or scale) big and bold; a Drop voicing adds its name underneath.
  const gParts = caption.split(" \u00b7 ");
  const nameTitle = guided ? gParts[0] : exTitle;
  const nameSub = guided ? (gParts[1] ?? "") : exSub;
  const frameBase = eff === 0 ? `${cs(I, "dom9")}` : eff === 4 ? `${cs(III, "hdim")}` : `${cs(V, "m6")}`;
  const shareName = `${asciiName(frameBase)}-shape${cur.p + 1}-fret${cur.lo}-${asciiName(LAYER_NAME[mode])}.png`;
  // Share: a plain paper-white PNG with only the bold chord name and the diagram, handed to the native share sheet (or downloaded
  // where the browser has none).
  const sharePng = async (): Promise<void> => {
    const svg = document.getElementById("nine-board") as SVGSVGElement | null;
    if (!svg) return;
    try { await document.fonts.load(`400 88px ${REALBOOK}`, `${nameTitle}\u266d\u266f`); await document.fonts.ready; } catch { /* draw with fallbacks */ }
    const W = 1080;
    const M = 80;
    const shareTitle = nameTitle;
    // The board: a static copy of the live SVG at its final state (no fades, no animations).
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const vb = svg.viewBox.baseVal;
    let vbw = vb.width;
    // On the scrolling neck, share what is on screen (a zoom-sized window), with the string names drawn into it.
    const sc = document.getElementById("nine-scroll");
    if (sc) {
      const vbx = Math.max(0, Math.min(vb.width - ZOOM_W, sc.scrollLeft / (sc.clientWidth / ZOOM_W)));
      vbw = ZOOM_W;
      clone.setAttribute("viewBox", `${vbx} 0 ${ZOOM_W} ${vb.height}`);
      const NS = "http://www.w3.org/2000/svg";
      const bgr = document.createElementNS(NS, "rect");
      bgr.setAttribute("x", String(lefty ? vbx + ZOOM_W - 26 : vbx));
      bgr.setAttribute("y", "0");
      bgr.setAttribute("width", "26");
      bgr.setAttribute("height", String(vb.height));
      bgr.setAttribute("fill", PAGE);
      clone.appendChild(bgr);
      STR_NAMES.forEach((nm: string, s: number) => {
        const tx = document.createElementNS(NS, "text");
        tx.setAttribute("x", String(lefty ? vbx + ZOOM_W - 18 : vbx + 18));
        tx.setAttribute("y", String(20 + (5 - s) * 28 + 4));
        tx.setAttribute("text-anchor", lefty ? "start" : "end");
        tx.setAttribute("font-size", "11");
        tx.setAttribute("fill", INK2);
        tx.textContent = nm;
        clone.appendChild(tx);
      });
    }
    // Notes that are only faded on screen (the ghosts around a Drop chord) are left out of the image.
    clone.querySelectorAll('g[data-vis="1"]').forEach((g: Element) => { const c = g.querySelector("circle"); if (c && parseFloat((c as SVGElement).style.opacity || "1") < 0.5) g.remove(); });
    const bw = W - 2 * M;
    const bh = (bw * vb.height) / vbw;
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
    // The chord name, its subtitle line when there is one ("Drop 2"), then the diagram.
    const TITLE_H = nameSub ? 176 : 120;
    const H = M + TITLE_H + bh + M;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = PAGE;
    ctx.fillRect(0, 0, W, H);
    // The name: bold, centred, as large as fits on one line.
    // Drawn in pieces so the flats, sharps and extension numbers can be raised and smaller, as on screen.
    const pieces = titlePieces(shareTitle);
    const widthAt = (px: number): number => pieces.reduce((w: number, x: TitlePiece) => { ctx.font = `400 ${px * x.scale}px ${REALBOOK}`; return w + ctx.measureText(x.t).width + (x.after ?? 0) * px; }, 0);
    let fs = 104;
    while (fs > 44 && widthAt(fs) > W - 2 * M) fs -= 4;
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    let tx = (W - widthAt(fs)) / 2;
    pieces.forEach((x: TitlePiece) => {
      ctx.font = `400 ${fs * x.scale}px ${REALBOOK}`;
      ctx.fillText(x.t, tx, M + 90 - fs * x.rise);
      tx += ctx.measureText(x.t).width + (x.after ?? 0) * fs;
    });
    if (nameSub) {
      ctx.font = `400 34px ${SANS}`;
      ctx.fillStyle = INK2;
      ctx.textAlign = "center";
      let sub = nameSub;
      while (sub.length > 4 && ctx.measureText(sub).width > W - 2 * M) sub = sub.slice(0, -1);
      ctx.fillText(sub, W / 2, M + 140);
    }
    ctx.drawImage(img, M, M + TITLE_H, bw, bh);
    URL.revokeObjectURL(url);
    const blob = await new Promise<Blob | null>((res: (b: Blob | null) => void) => cv.toBlob(res, "image/png"));
    if (!blob) return;
    const file = new File([blob], shareName, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file] }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
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
    const q = seq[shapeIdx + d];
    if (!q) return d < 0 ? "This is the lowest copy, at the nut" : "This is the highest copy";
    return `${shapeLabel(q)} \u00b7 frets ${q.lo}\u2013${q.hi}`;
  };
  const STEP_TITLE = [`${cs(I, "dom7")} is four notes`, "Rootless Chords", "Add the 9", "Chord Synonyms: same notes, three names", "The dominant pentatonic", `${I} Mixolydian: the 4 and 6`, "Drop Voicings: Drop 2 and Drop 3", "Explore the whole neck"];
  const tipText = (id: string): string => {
    if (id.startsWith("step")) { const i = Number(id.slice(4)); return `${i + 1} \u00b7 ${STEP_TITLE[i]}`; }
    if (id.startsWith("shape")) { const p = Number(id.slice(5)); return `Shape ${p + 1} \u00b7 ${CAGED[0][p]} shape from ${I}, ${CAGED[4][p]} from ${III}, ${CAGED[7][p]} from ${V}${cur.p === p && canOctave ? " \u00b7 tap again for the next octave" : ""}`; }
    if (id === "prev") return nb(-1);
    if (id === "next") return nb(1);
    if (id === "octave-up" || id === "octave-down") return !canOctave ? "This shape has only one copy" : id === "octave-up" ? "Same shape, one octave up (from the top, back to the nut)" : "Same shape, one octave down (from the nut, to the top)";
    if (id === "play") return playing ? "Stop" : "Play what is shown";
    if (id === "settings") return open ? "Hide settings" : "Settings: labels, key, neck, share";
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

  const css = ":root,html,body{color-scheme:only light!important;background:#fdfcfb!important;color:#4d3533!important;margin:0}"
    + " html body #nine-root#nine-root,html body #nine-root#nine-root div,html body #nine-root#nine-root p,html body #nine-root#nine-root h1,html body #nine-root#nine-root h2{color-scheme:only light!important}"
    + " html body #nine-root#nine-root h1,html body #nine-root#nine-root h2,html body #nine-root#nine-root p,html body #nine-root#nine-root li{color:#4d3533!important}"
    + " #nine-root button,#nine-root select{-webkit-appearance:none;appearance:none;margin:0;font-family:inherit}"
    + " #nine-root button:focus-visible,#nine-root select:focus-visible{outline:2px solid #0f766e;outline-offset:2px}"
    + " #nine-root .nine-seg button::after{content:'';position:absolute;inset:0;background:#4d3533;opacity:0;transition:opacity 150ms ease;pointer-events:none}"
    + " #nine-root .nine-seg button[aria-checked=false]:hover::after{opacity:.07}"
    + " #nine-root .nine-btn:hover:not(:disabled){filter:brightness(.96)} #nine-root .nine-btn-primary:hover:not(:disabled){filter:brightness(1.15)}"
    + " #nine-root .nine-card{height:100px} #nine-root .nine-card.nine-tall{height:68px} @media (max-width:600px){#nine-root .nine-card{height:118px} #nine-root .nine-card.nine-tall{height:68px}}"
    + " @media (max-width:380px){#nine-root .nine-layers button{font-size:11.5px!important;padding:0 1px!important}}"
    + " #nine-root .nine-long{display:none} @media (min-width:560px){#nine-root .nine-short{display:none} #nine-root .nine-long{display:inline}}"
    + " @media (max-width:380px){#nine-root .nine-step span:last-child{font-size:10px!important}}"
    + " @media (max-width:340px){#nine-root .nine-step span:last-child{font-size:9px!important;letter-spacing:-.1px} #nine-root nav[aria-label='Lesson steps']{gap:1px!important}}"
    + " #nine-root .nine-shbtn{display:flex;align-items:center;justify-content:center;gap:5px;flex-direction:row;overflow:hidden} #nine-root .nine-shbtn .cap{font-size:12px;line-height:14px;font-weight:500} #nine-root .nine-shbtn .num{font-size:14px;line-height:16px;font-weight:600}"
    + " @media (max-width:380px){#nine-root .nine-shbtn{flex-direction:column;gap:0} #nine-root .nine-shbtn .cap{font-size:9.5px;line-height:10px} #nine-root .nine-shbtn .num{font-size:15px;line-height:17px}}"
    + " #nine-root .nine-q{transition:opacity 260ms ease}"
    + " #nine-root[data-guided='1'] .nine-quiet{opacity:.42} #nine-root[data-guided='1'] .nine-quiet:hover,#nine-root[data-guided='1'] .nine-quiet:focus-within{opacity:1}"
    + " #nine-root[data-spot='1'] .nine-q,#nine-root[data-spot='1'] .nine-quiet{opacity:.14!important}"
    + " @font-face{font-family:'MuseJazz Text';src:url('" + SITE_ROOT + "fonts/MuseJazzText.otf') format('opentype');font-display:swap}"
    + " @font-face{font-family:'MuseJazz Text';src:url('" + SITE_ROOT + "fonts/MuseJazz.otf') format('opentype');unicode-range:U+266D,U+266F;font-display:swap}"
    + " @keyframes nine-in{from{opacity:0}to{opacity:1}} @keyframes nine-lbl{from{opacity:0}to{opacity:1}}"
    + " @keyframes nine-r{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}} @keyframes nine-l{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}"
    + " @keyframes nine-pop{from{opacity:0;transform:translateY(-4px) scale(.96)}to{opacity:1;transform:none}}"
    + " @media (hover:hover){#nine-root .nine-arrow:hover:not(:disabled) svg{opacity:.6}}"
    + " @media (hover:hover){#nine-root .nine-icon:hover svg{opacity:.6}} #nine-root .nine-icon svg{transition:opacity 150ms ease}"
    + " html,body{overflow-x:hidden!important;max-width:100%} #nine-root{overflow-x:clip;max-width:100vw} #nine-root svg{max-width:100%}";

  // Play and Settings: in the controls row on the guided steps; on Explore they sit at the top right of the card, so the label tabs get the full width.
  const playToggle = (
    <button type="button" className="nine-icon" id="nine-play" aria-label={playing ? "Stop" : "Play what is shown"} aria-pressed={playing} {...tipOn("play")} onClick={playShown} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 32, width: 32, padding: 0, margin: 0, flex: "0 0 auto", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", color: INK, backgroundColor: PAGE }}>
              <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" style={{ display: "block" }}>
                {playing ? <rect x={4.5} y={4.5} width={9} height={9} rx={1.5} strokeWidth={1.4} style={{ fill: INK, stroke: INK }} /> : <path d="M5 3.2 L14.4 9 L5 14.8 Z" strokeWidth={1.4} strokeLinejoin="round" style={{ fill: PAGE, stroke: INK }} />}
              </svg>
            </button>
  );
  const settingsToggle = (
    <button type="button" className="nine-icon nine-quiet" aria-label="Display settings" aria-controls="nine-settings" aria-expanded={open} {...tipOn("settings")} onClick={() => setOpen(!open)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 3, height: 32, minWidth: 32, padding: 0, margin: 0, flex: "0 0 auto", border: 0, borderRadius: 0, boxShadow: "none", outlineOffset: 2, cursor: "pointer", color: INK, backgroundColor: PAGE }}>
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
  );
  return (
    <div ref={rootRef} id="nine-root" className="nine-root" data-spot={spot !== null ? "1" : "0"} data-guided={guided ? "1" : "0"} style={{ backgroundColor: PAGE, color: INK, colorScheme: "only light", minHeight: "100vh", width: "100%", padding: "12px 16px 16px", fontFamily: SANS, boxSizing: "border-box" }}>
      <style>{css}</style>
      <div style={{ maxWidth: 640, margin: "0 auto", backgroundColor: PAGE, color: INK, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="nine-q nine-quiet" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, backgroundColor: PAGE }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 400, lineHeight: "26px", letterSpacing: "-0.5px", color: INK, backgroundColor: PAGE, margin: 0 }}>Dominant Pentatonics</h1>
          <a href={SITE_ROOT} style={{ flex: "0 0 auto", fontFamily: SANS, fontSize: 12.5, lineHeight: "16px", color: INK2, backgroundColor: PAGE, textDecoration: "none" }}>{"← All lessons"}</a>
        </div>
        {/* On every step, so the page never changes height as you move between steps. */}
        <div className={helpOpen ? "nine-q" : "nine-q nine-quiet"} style={{ backgroundColor: PAGE, fontFamily: SANS, fontSize: 12.5, lineHeight: "18px", color: INK2 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 14, backgroundColor: PAGE }}>
            {HELPFUL.length > 0 ? <button type="button" aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)} style={{ padding: 0, border: 0, boxShadow: "none", cursor: "pointer", font: "inherit", color: INK2, backgroundColor: PAGE, textDecoration: "underline", textUnderlineOffset: 2 }}>{helpOpen ? "Helps to know \u25b4" : "Helps to know \u25be"}</button> : null}
            <button type="button" id="nine-tutorial" onClick={startTutorial} style={{ padding: 0, border: 0, boxShadow: "none", cursor: "pointer", font: "inherit", color: INK2, backgroundColor: PAGE, textDecoration: "underline", textUnderlineOffset: 2 }}>Show tutorial</button>
          </div>
          {helpOpen && HELPFUL.length > 0 ? (
            <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3, backgroundColor: PAGE }}>
              {HELPFUL.map((h: Helpful) => (
                <li key={h.topic} style={{ backgroundColor: PAGE }}>
                  {h.href ? <a href={SITE_ROOT + h.href} style={{ color: INK, backgroundColor: PAGE }}>{chordify(h.topic)}</a> : <span style={{ color: INK, backgroundColor: PAGE }}>{chordify(h.topic)}</span>}
                  {h.href ? "" : " (coming soon)"}: {chordify(h.why)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Step chips: progress and navigation in one row. The bar fills up to the current card; tap any chip to jump. */}
        <nav aria-label="Lesson steps" className="nine-q nine-quiet" style={{ display: "grid", gridTemplateColumns: STEP_LABEL.map((lb: string, i: number) => `minmax(28px,${lb.length + (STEP_LONG[i] ? 4 : 2)}fr)`).join(" "), gap: 3, backgroundColor: PAGE }}>
          {STEP_LABEL.map((lb: string, i: number) => (
            <button key={lb} type="button" className="nine-step" aria-label={`Step ${i + 1} of ${total}: ${STEP_LONG[i] ?? lb}`} aria-current={i === card ? "step" : undefined} {...tipOn(`step${i}`)} onClick={() => go(i)} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5, height: 32, minWidth: 0, padding: "2px 0", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", color: INK, backgroundColor: PAGE }}>
              <span style={{ display: "block", height: 4, borderRadius: 2, backgroundColor: i <= card ? TEAL : LINE, transition: "background-color 300ms ease" }} />
              <span style={{ display: "block", fontFamily: SANS, fontSize: 11, lineHeight: "14px", fontWeight: i === card ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "clip", textAlign: "center", color: i === card ? INK : INK2, backgroundColor: PAGE }}>{STEP_LONG[i] ? <><span className="nine-short">{lb}</span><span className="nine-long">{STEP_LONG[i]}</span></> : lb}</span>
            </button>
          ))}
        </nav>

        <div className={C.kind === "explore" ? "nine-card nine-tall" : "nine-card"} style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", backgroundColor: PAGE }}>
          {!guided ? <div style={{ position: "absolute", top: 0, right: 0, display: "flex", alignItems: "center", gap: 4, zIndex: 1, backgroundColor: PAGE }}>{playToggle}{settingsToggle}</div> : null}
          <div key={`card${card}-${beat}`} style={{ display: "flex", flexDirection: "column", gap: 4, animation: `${dir > 0 ? "nine-r" : "nine-l"} 340ms ${EASE} both`, backgroundColor: PAGE }}>{body}</div>
        </div>

        <div className="nine-q" style={{ minHeight: guided ? 34 : 42, minWidth: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: 12, color: INK2, backgroundColor: PAGE, lineHeight: "16px" }}>
          {guided ? (<>
          <div style={{ flex: 1, minWidth: 0, backgroundColor: PAGE }} />
            <div role="radiogroup" id="nine-show" aria-label="Show intervals or note names" className="nine-q" style={{ display: "inline-flex", flex: "0 0 auto", height: 24, border: `1px solid ${LINE_UI}`, borderRadius: 12, overflow: "hidden", boxSizing: "border-box", backgroundColor: PAGE }}>
              {[["intervals", "Intervals"], ["notes", "Notes"]].map(([v, lb]: string[]) => (
                <button key={v} type="button" role="radio" aria-checked={show === v} onClick={() => setShow(v)} style={{ height: "100%", padding: "0 8px", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", fontFamily: SANS, fontSize: 11, fontWeight: 600, lineHeight: "22px", color: show === v ? PAGE : INK, backgroundColor: show === v ? INK : PAGE, transition: "background-color 200ms ease, color 200ms ease" }}>{lb}</button>
              ))}
            </div>
          </>) : (<>
            {/* Explore: one control says how the dots are labelled: note names, or intervals counted from the rootless C9, the Eø or the Gm6 (the same four notes, three names). */}
            <div id="nine-labels" aria-label="Label the dots" style={{ flex: 1, minWidth: 0, backgroundColor: PAGE }}>
              {scaleLayer
                ? tabsBtn("Label the dots", [{ value: "notes", label: "Note Names" }, { value: "0", label: "Intervals" }], show === "notes" ? "notes" : "0", (v: string) => { setShow(v === "notes" ? "notes" : "intervals"); setFrame("0"); }, [1, 1], undefined, false, 12.5, 42)
                : (<div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, backgroundColor: PAGE }}>
                  <div id="nine-from" style={{ flex: 1, minWidth: 0, backgroundColor: PAGE }}>{tabsBtn("Count from", [{ value: "0", label: `${cs(I, "dom9")}` }, { value: "4", label: `${cs(III, "hdim")}` }, { value: "7", label: `${cs(V, "m6")}` }], frame, (v: string) => setFrame(v), [1, 1, 1], undefined, false, 12.5, 42)}</div>
                  <div role="radiogroup" id="nine-show-explore" aria-label="Label the dots" style={{ flex: "0 0 auto", display: "inline-flex", flexDirection: "column", border: `1px solid ${LINE_UI}`, borderRadius: 9, overflow: "hidden", boxSizing: "border-box", backgroundColor: PAGE }}>
                    {[["notes", "Names"], ["intervals", "Intervals"]].map(([v, lb]: string[]) => (
                      <button key={v} type="button" role="radio" aria-checked={show === v} onClick={() => setShow(v)} style={{ height: 21, padding: "0 10px", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", fontFamily: SANS, fontSize: 11, fontWeight: 600, lineHeight: "21px", color: show === v ? PAGE : INK, backgroundColor: show === v ? INK : PAGE, transition: "background-color 200ms ease, color 200ms ease" }}>{lb}</button>
                    ))}
                  </div>
                </div>)}
            </div>
          </>)}
            {guided ? settingsToggle : null}
        </div>

        {/* Inline settings: expands in the flow above the board and stays open across cards until toggled. */}
        <div id="nine-settings" aria-hidden={!open} style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0, marginTop: open ? 0 : -8, visibility: open ? "visible" : "hidden", transition: `grid-template-rows 280ms ${EASE}, margin-top 280ms ${EASE}, opacity 220ms ease, visibility 0s linear ${open ? 0 : 280}ms`, backgroundColor: PAGE }}>
          <div style={{ minHeight: 0, overflow: "hidden", backgroundColor: PAGE }}>
              <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, backgroundColor: PAGE, color: INK, border: `1px solid ${LINE}`, borderRadius: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center", backgroundColor: PAGE }}>
                  <Field label="" style={{ gap: 0 }}>
                    <select value={keyId} onChange={(e: ChangeEvent<HTMLSelectElement>) => { const nk = KEYS.find((x: KeyDef) => x.id === e.target.value) ?? KEYS[0]; const list = instances(nk); let best = homeIndex(list); list.forEach((q: Pos, i: number) => { if (q.p === cur.p && (list[best].p !== cur.p || Math.abs(q.lo - cur.lo) < Math.abs(list[best].lo - cur.lo))) best = i; }); setInst(best); setKeyId(e.target.value); }} style={{ height: CH, width: "100%", boxSizing: "border-box", fontFamily: SANS, fontSize: CFS, fontWeight: 500, color: INK, backgroundColor: PAGE, border: BORDER, borderRadius: RAD, padding: "0 26px 0 12px", lineHeight: "18px", colorScheme: "only light", cursor: "pointer", backgroundImage: "linear-gradient(45deg, transparent 50%, #4d3533 50%), linear-gradient(135deg, #4d3533 50%, transparent 50%)", backgroundPosition: "calc(100% - 15px) 50%, calc(100% - 10px) 50%", backgroundSize: "5px 5px, 5px 5px", backgroundRepeat: "no-repeat" }}>
                      {KEYS.map((x: KeyDef) => <option key={x.id} value={x.id} style={{ color: INK, backgroundColor: PAGE }}>{`Key of ${flat(x.id)}`}</option>)}
                    </select>
                  </Field>
                  <Check on={lefty} label="Left-handed" onClick={() => setLefty(!lefty)} />
                </div>
                <Field label="Sound">
                  <select id="nine-sound" value={sound} onChange={(e: ChangeEvent<HTMLSelectElement>) => { const id = e.target.value as InstrumentId; setSound(id); setInstrument(id); }} style={{ height: CH, width: "100%", boxSizing: "border-box", fontFamily: SANS, fontSize: CFS, fontWeight: 500, color: INK, backgroundColor: PAGE, border: BORDER, borderRadius: RAD, padding: "0 26px 0 12px", lineHeight: "18px", colorScheme: "only light", cursor: "pointer", backgroundImage: "linear-gradient(45deg, transparent 50%, #4d3533 50%), linear-gradient(135deg, #4d3533 50%, transparent 50%)", backgroundPosition: "calc(100% - 15px) 50%, calc(100% - 10px) 50%", backgroundSize: "5px 5px, 5px 5px", backgroundRepeat: "no-repeat" }}>
                    {INSTRUMENTS.map((i: { id: InstrumentId; label: string }) => <option key={i.id} value={i.id} style={{ color: INK, backgroundColor: PAGE }}>{i.label}</option>)}
                  </select>
                </Field>
                <Field label="Neck" style={{ opacity: onExplore ? 1 : 0.35, pointerEvents: onExplore ? "auto" : "none", transition: "opacity 200ms ease" }}>
                  <span id="nine-full" style={{ display: "block", backgroundColor: PAGE }}>{segBtn([{ value: "scroll", label: "Scroll (Explore)" }, { value: "full", label: "Fit all" }], full ? "full" : "scroll", (v: string) => setFull(v === "full"))}</span>
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, backgroundColor: PAGE }}>
                  <button type="button" className="nine-btn" id="nine-settings-tutorial" style={btn(false, false)} onClick={startTutorial}>Show tutorial</button>
                  <button type="button" className="nine-btn" aria-label="Share this diagram as an image" id="nine-share" style={btn(false, false)} onClick={() => { void sharePng(); }}>Share image</button>
                </div>
              </div>
          </div>
        </div>
        {/* Shape row: pick Shape 1-5 directly (nearest position), or use the board arrows / swipe to walk the whole neck. */}
        {guided ? (
        <button type="button" className="nine-btn nine-q" id="nine-hear" aria-pressed={playing} onClick={playShown} style={{ ...btn(false, false), width: "100%", height: 36 }}>{playing ? "\u25a0 Stop" : "\u25b6 Hear it"}</button>
        ) : (
        <div className="nine-q" id="nine-shape" data-p={cur.p + 1} data-lo={cur.lo} data-hi={cur.hi} role="radiogroup" aria-label="Shape" style={{ display: "grid", gridTemplateColumns: [0, 1, 2, 3, 4].map((p: number) => `minmax(0, 1fr)`).join(" "), height: 36, minWidth: 0, borderBottom: `1px solid ${LINE}`, overflow: "hidden", boxSizing: "border-box", backgroundColor: PAGE }}>
          {[0, 1, 2, 3, 4].map((p: number) => {
            const inner = (
              <button key={`sh${p}`} type="button" className="nine-shbtn" role="radio" aria-checked={cur.p === p} aria-label={`Shape ${p + 1}: ${CAGED[0][p]} shape from ${I}, ${CAGED[4][p]} from ${III}, ${CAGED[7][p]} from ${V}${cur.p === p && canOctave ? ". Tap again to move it an octave." : ""}`} {...tipOn(`shape${p}`)} onClick={() => pickShape(p)} style={{ width: "100%", padding: 0, position: "relative", height: "100%", minWidth: 0, border: 0, borderRadius: 0, boxShadow: cur.p === p ? `inset 0 -2px 0 ${INK}` : "none", cursor: "pointer", fontFamily: SANS, fontWeight: cur.p === p ? 700 : 400, color: cur.p === p ? INK : INK2, backgroundColor: PAGE, transition: "color 200ms ease, box-shadow 200ms ease" }}>
              <span className="cap">Shape</span><span className="num">{p + 1}</span>
            </button>
            );
            return inner;
          })}
        </div>
        )}
        <div id="nine-name" aria-live="polite" style={{ position: "relative", display: "flex", justifyContent: "center", minHeight: 55, padding: "9px 36px 0", boxSizing: "border-box", backgroundColor: PAGE, textAlign: "center" }}>
          {/* Equal air above the name and between it and the first dot: the board has its own 9px of padding, so the block starts 9px down; a lone name sits 9px lower in the block so the board never moves. */}
          <div style={{ minWidth: 0, marginTop: nameSub ? 0 : 6, backgroundColor: PAGE }}>
            <div id="nine-name-title" style={{ fontFamily: REALBOOK, fontSize: nameTitle.length > 20 ? 25 : 32, fontWeight: 400, lineHeight: "34px", letterSpacing: 0, color: INK, backgroundColor: PAGE, overflowWrap: "anywhere" }}>{titleNodes(nameTitle)}</div>
            {nameSub ? <div id="nine-name-sub" style={{ marginTop: 2, fontFamily: SANS, fontSize: 13, fontWeight: 400, lineHeight: "16px", color: INK2, backgroundColor: PAGE }}>{nameSub}</div> : null}
          </div>
          <button type="button" className="nine-icon" id="nine-share-quick" aria-label="Share this diagram as an image" onClick={() => { void sharePng(); }} style={{ position: "absolute", right: 0, top: nameSub ? 9 : 18, display: "inline-flex", alignItems: "center", justifyContent: "center", height: 32, width: 32, padding: 0, margin: 0, flex: "0 0 auto", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", color: INK, backgroundColor: PAGE }}>
            <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" style={{ display: "block" }}>
              <path d="M9 11.5 V2.5 M5.8 5.5 L9 2.3 L12.2 5.5 M3.5 9 V14.5 H14.5 V9" fill="none" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: INK }} />
            </svg>
          </button>
        </div>
        <div style={{ position: "relative", backgroundColor: PAGE }} onTouchStart={(e: { touches: ArrayLike<{ clientX: number; clientY: number }> }) => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; }} onTouchEnd={(e: { changedTouches: ArrayLike<{ clientX: number; clientY: number }> }) => { const s = touchRef.current; touchRef.current = null; if (!s) return; const t = e.changedTouches[0]; const dx = t.clientX - s.x; const dy = t.clientY - s.y; if (!scrollOn && Math.abs(dx) > 48 && Math.abs(dy) < 36) stepShape(dx < 0 ? (lefty ? -1 : 1) : (lefty ? 1 : -1)); }}>
          <Board plain9={!guided} ghostRoot={ghostRoot} key={`board${jump}-${fullOn ? 1 : 0}-${scrollOn ? 1 : 0}`} full={fullOn} scroll={scrollOn} onPlay={playDot} onSettle={settleScroll} center={(cur.lo + cur.hi) / 2} band={fullOn ? [cur.lo, cur.hi] : undefined} k={k} shown={shown} wl={Math.max(0, Math.min(cur.lo - 1, MAXF - 6))} step={bt ? bt.step : MODE_STEP[mode]} dim={dimSet} spot={spot} labelOf={labelOf} ringDeg={ringDeg} lefty={lefty} drop2={mode === "drop3" ? cur.drop3 : cur.drop} />
          {(guided ? [] : [-1, 1]).map((d: number) => {
            const ok = canShape(d);
            const onLeft = lefty ? d > 0 : d < 0;
            return (
              <button key={d} type="button" className="nine-arrow" aria-label={d < 0 ? "Previous shape, down the neck" : "Next shape, up the neck"} {...tipOn(d < 0 ? "prev" : "next")} disabled={!ok} onClick={() => stepShape(d)} style={{ position: "absolute", top: "calc(45.5% - 28px)", height: 56, width: 36, borderRadius: 8, [onLeft ? "left" : "right"]: -16, display: "flex", alignItems: "center", justifyContent: onLeft ? "flex-start" : "flex-end", padding: "0 3px", border: 0, boxShadow: "none", cursor: ok ? "pointer" : "default", opacity: ok ? 1 : 0.22, transition: "opacity 200ms ease", color: INK }}>
                <svg width={12} height={22} viewBox="0 0 12 22" aria-hidden="true" style={{ display: "block" }}>
                  <path d={onLeft ? "M9 3 L3 11 L9 19" : "M3 3 L9 11 L3 19"} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: INK }} />
                </svg>
              </button>
            );
          })}
        </div>
        {/* Explore: the same shape one octave down or up, under the board's left and right arrows. The row keeps its height so nothing jumps. */}
        {!guided ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 28, marginTop: -6, backgroundColor: PAGE, visibility: canOctave ? "visible" : "hidden" }}>
            {(lefty ? [1, -1] : [-1, 1]).map((d: number) => {
              const lo = seq[shapeIdx].lo;
              const ok = d < 0 ? copies.some((i: number) => seq[i].lo < lo) : copies.some((i: number) => seq[i].lo > lo);
              return (
                <button key={`oct${d}`} type="button" className="nine-oct" aria-label={d < 0 ? "Down an octave" : "Up an octave"} disabled={!ok} onClick={() => octaveShape(d)} title={d < 0 ? "Down an octave" : "Up an octave"} style={{ width: 36, height: 28, padding: 0, [(lefty ? d > 0 : d < 0) ? "marginLeft" : "marginRight"]: -8, border: 0, borderRadius: 8, boxShadow: "none", cursor: ok ? "pointer" : "default", fontFamily: SANS, fontSize: 22, fontWeight: 300, lineHeight: "28px", color: INK, opacity: ok ? 1 : 0.22, transition: "opacity 200ms ease", backgroundColor: PAGE }}>{d < 0 ? "\u2212" : "+"}</button>
              );
            })}
          </div>
        ) : null}
        <div id="nine-nav" className="nine-q" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, backgroundColor: PAGE }}>
          <button type="button" className="nine-btn" style={{ ...btn(false, card === 0 && beat === 0), height: 44, fontSize: 15 }} disabled={card === 0 && beat === 0} onClick={() => prev()}>{"\u2190 Back"}</button>
          <button type="button" className="nine-btn nine-btn-primary" style={{ ...btn(true, false), height: 44, fontSize: 15 }} onClick={() => next()}>{card === total - 1 ? "Start over" : "Continue \u2192"}</button>
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
      {tut ? <Tutorial steps={TUT_STEPS} onStep={(st: TutStep): boolean => { const at = st.at ?? [0, 0]; const wantOpen = st.settings === true; const moved = at[0] !== cardRef.current || at[1] !== beatRef.current || wantOpen !== openRef.current; go(at[0], at[1]); setOpen(wantOpen); return moved; }} onClose={endTutorial} /> : null}
    </div>
  );
}
