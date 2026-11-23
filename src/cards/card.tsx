import { createRoot } from "react-dom/client";
import Board from "../shared/drop/Board";
import type { Voice } from "../shared/drop/Board";
import { DROP2, DROP3, instances, homeFor, viewVoices, windowFor, Q, chordName, toneIv, rootName } from "../shared/drop/theory";
import type { DropType, VV } from "../shared/drop/theory";
import { KEYS, titleNodes } from "../shared/notation";
import { INK, INK2, PAGE, RED, SERIF, SANS, REALBOOK } from "../shared/ui";

// The 1200x630 link-preview cards (Open Graph / Twitter). Drawn by the same Board and chord-name code as the lessons, and captured by
// tests/make-share-cards.js; nothing here is a picture of its own.
export interface CardSpec { kind: "catalog" | "lesson"; title: string; subtitle: string; chord: { drop?: "drop2" | "drop3"; set: number; inv: number; rootless?: boolean } }

function build(spec: CardSpec) {
  const k = KEYS[0];
  const dt: DropType = spec.chord.drop === "drop3" ? DROP3 : DROP2;
  const q = Q(spec.chord.rootless ? "dom7" : "maj7");
  const list = instances(k, spec.chord.set, spec.chord.inv, dt);
  const inst = list[homeFor(list, [q], ["drop"])];
  const vv = viewVoices(inst, q, "drop") as VV[];
  const wl = windowFor(inst, [q], ["drop"]) ?? 0;
  let name = chordName(k, q, spec.chord.inv);
  const voices: Voice[] = vv.map((v: VV): Voice => ({ s: v.s, f: v.f, fill: v.tone === 0 ? RED : INK, label: toneIv(q, v.tone), op: 1, halo: false }));
  if (spec.chord.rootless) {
    // The dominant 9 without its root: E G B-flat D (3 5 b7 9), the missing root a dashed red ring on the A string.
    const D9 = [[2, 14, "3"], [3, 15, "♭7"], [4, 15, "9"], [5, 15, "5"]] as [number, number, string][];
    voices.length = 0;
    D9.forEach(([s, f, l]) => voices.push({ s, f, fill: INK, label: l, op: 1, halo: false }));
    voices.push({ s: 1, f: 15, fill: RED, label: "R", op: 1, halo: false, dashed: true });
    name = "C9";
  }
  return { name, voices, wl: spec.chord.rootless ? 13 : wl, root: rootName(k) };
}

function Card(props: { spec: CardSpec }) {
  const { spec } = props;
  const b = build(spec);
  const lesson = spec.kind === "lesson";
  return (
    <div id="card" style={{ width: 1200, height: 630, boxSizing: "border-box", padding: "56px 64px", backgroundColor: PAGE, color: INK, display: "grid", gridTemplateColumns: "470px 1fr", columnGap: 48, alignItems: "center", fontFamily: SANS, position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 600, letterSpacing: "0.03em", color: INK2 }}>{lesson ? "Advanced Guitar Theory" : "Interactive fretboard lessons"}</div>
        <div style={{ fontFamily: SERIF, fontSize: lesson ? 62 : 74, lineHeight: 1.04, letterSpacing: "-1.5px", fontWeight: 400 }}>{spec.title}</div>
        {lesson ? <div style={{ fontFamily: REALBOOK, fontSize: 84, lineHeight: 1.1, marginTop: 6 }}>{titleNodes(b.name, 1)}</div> : null}
        <div style={{ fontFamily: SANS, fontSize: 26, lineHeight: 1.35, fontWeight: 350, color: INK2 }}>{spec.subtitle}</div>
      </div>
      <div style={{ backgroundColor: PAGE }}><Board voices={b.voices} wl={b.wl} lefty={false} onPlay={() => {}} /></div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, backgroundColor: INK }} />
    </div>
  );
}

(window as unknown as { renderCard: (s: CardSpec) => void }).renderCard = (spec: CardSpec) => {
  const el = document.getElementById("root") as HTMLElement;
  createRoot(el).render(<Card spec={spec} />);
};
