import type { CSSProperties } from "grok/canvas";
import { INK, INK2, PAGE, SANS, EASE } from "../../shared/ui";
import { STR_NAMES, MAXF } from "./theory";

// The same fretboard as the first lesson (a seven-fret window, string names on the left, the nut at fret 0), drawn for one Drop 2 chord.
// The four voices are kept by voice, not by position, so when a note changes only its dot slides and re-labels; the others stay where they are.
export interface Voice { s: number; f: number; fill: string; label: string; op: number; halo: boolean; ghost?: { s: number; f: number }; alt?: string }

const FRET_LABELS = [3, 5, 7, 9, 12, 15, 17, 19, 21];

export default function Board(props: { voices: Voice[]; wl: number; lefty: boolean; onPlay: (s: number, f: number) => void }) {
  const { voices, wl, lefty, onPlay } = props;
  const sg = 28;
  const lab = 26;
  const top = 20;
  const cw = 46;
  const r = 11.5;
  const openW = 32;
  const VW = 7 * cw;
  const W = lab + VW + 8;
  const H = top + 5 * sg + 38;
  const gx = (f: number): number => { const x = f === 0 ? -openW / 2 : (f - 0.5) * cw; return lefty ? -x : x; };
  const lx = (x: number): number => (lefty ? -x : x);
  const Y = (s: number): number => top + (5 - s) * sg;
  const vs = wl === 0 ? -openW : (wl - 1) * cw;
  const left = lefty ? 8 : lab;
  const tx = lefty ? left + vs + VW : left - vs;
  const midY = (Y(2) + Y(3)) / 2;
  const frets = Array.from({ length: MAXF }, (_: unknown, i: number) => i + 1);
  return (
    <svg id="drop-board" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: "100%", height: "auto", fontFamily: SANS, overflow: "hidden", backgroundColor: PAGE }} role="img" aria-label={`Fretboard from fret ${wl}`}>
      <defs><clipPath id="drop-clip"><rect x={left - 2} y={0} width={VW + 4} height={H} /></clipPath></defs>
      {[0, 1, 2, 3, 4, 5].map((s: number) => (
        <text key={`sn${s}`} x={lefty ? left + VW + 8 : lab - 8} y={Y(s) + 4} textAnchor={lefty ? "start" : "end"} fontSize={11} style={{ fill: INK2 }}>{STR_NAMES[s]}</text>
      ))}
      <g clipPath="url(#drop-clip)">
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
          {frets.filter((f: number) => FRET_LABELS.includes(f)).map((f: number) => <text key={`n${f}`} x={gx(f)} y={Y(0) + 32} textAnchor="middle" fontSize={11} style={{ fill: INK2 }}>{f}</text>)}
          {voices.filter((v: Voice) => v.ghost).map((v: Voice) => {
            const g = v.ghost as { s: number; f: number };
            return (
              <g key={`gh${g.s}-${g.f}`} aria-hidden="true" style={{ pointerEvents: "none" }}>
                <line x1={gx(g.f)} y1={Y(g.s)} x2={gx(v.f)} y2={Y(v.s)} style={{ stroke: INK2 }} strokeWidth={1.4} strokeDasharray="3 3" opacity={0.7} />
                <circle cx={gx(g.f)} cy={Y(g.s)} r={r} style={{ fill: "none", stroke: INK2 }} strokeWidth={1.4} strokeDasharray="3 3" opacity={0.8} />
              </g>
            );
          })}
          {voices.map((v: Voice, i: number) => {
            const gStyle: CSSProperties = { transform: `translate(${gx(v.f)}px, ${Y(v.s)}px)`, transition: `transform 520ms ${EASE}`, cursor: "pointer" };
            const dbl = /[\u266d\u266f]{2}/.test(v.label);
            const size = dbl ? 10 : v.label.length > 2 ? 9.5 : 11.5;
            return (
              <g key={i} data-voice={i} data-s={v.s} data-f={v.f} data-vis="1" style={gStyle} onClick={(e: { currentTarget: SVGGElement }) => {
                onPlay(v.s, v.f);
                const c = e.currentTarget.querySelector("circle[data-dot]");
                if (c && c.animate) c.animate([{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 220, easing: "ease-out" });
              }}>
                {v.halo ? <circle className="drop-halo" r={r + 6} style={{ fill: "none", stroke: INK2, strokeWidth: 1.6 }} /> : null}
                <circle data-dot="1" r={r} style={{ fill: v.fill, stroke: v.fill, opacity: v.op, transition: "opacity 320ms ease, fill 320ms ease, stroke 320ms ease", transformBox: "fill-box", transformOrigin: "center" }} />
                {v.alt ? <text data-alt="1" x={(v.f - wl >= 4) !== lefty ? -(r + 11) : r + 11} y={-5} textAnchor={(v.f - wl >= 4) !== lefty ? "end" : "start"} fontSize={10.5} fontWeight={500} letterSpacing={0.6} style={{ fill: INK2, stroke: PAGE, strokeWidth: 4, paintOrder: "stroke", strokeLinejoin: "round", pointerEvents: "none", animation: "drop-lbl 360ms ease both" }}>{v.alt}</text> : null}
                <text key={v.label} y={size * 0.36} textAnchor="middle" fontSize={size} fontWeight={600} letterSpacing={dbl ? 1.4 : 0} style={{ fill: PAGE, opacity: v.op < 0.5 ? 0.7 : 1, animation: "drop-lbl 360ms ease both", pointerEvents: "none" }}>{v.label}</text>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
