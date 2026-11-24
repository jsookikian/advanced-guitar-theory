import { useState, useMemo, useEffect, useRef } from "grok/canvas";
import type { CSSProperties, ChangeEvent, ReactNode } from "grok/canvas";
import { pluck, playPhrase, stopAll, setInstrument, startDrone, stopDrone, INSTRUMENTS } from "../audio";
import type { InstrumentId } from "../audio";
import { SITE_ROOT } from "../site-root";
import Tutorial from "../Tutorial";
import type { TutStep } from "../Tutorial";
import { Pip } from "../pip";
import { KEYS, flat, chordify, chordChildren, titleNodes, chordSymbol, asciiName } from "../notation";
import type { KeyDef, ChordKind } from "../notation";
import { INK, INK2, PAGE, LINE, LINE_UI, TEAL, RED, SERIF, REALBOOK, SANS, EASE, Tabs, lockPaint, StickyHeader, STICKY_CSS } from "../ui";
import { shareBoard } from "../share";
import Board from "./Board";
import type { Voice } from "./Board";
import {
  OPEN_MIDI, BASS_LABELS, INV_NAMES, QUALITIES, Q, spellAt, rootName, chordName, toneNote, toneIv, instances, home, homeFor, viewVoices, place, windowFor, walkChords, progression,
} from "./theory";
import type { RootDef, Quality, Inst, QId, View, VV, ProgChord, DropType } from "./theory";

const CH = 36;
const RAD = 10;
const CFS = 13.5;
const BORDER = `1px solid ${INK}`;
const SEVENTH_LS = [0, 2, 4, 6];

// What each beat shows: the chord quality, the string set and inversion, which picture of it (closed, skip or drop), which tones stay lit
// (the others fade), which one pulses (and leaves a ghost behind, where it was in the picture `from`).
// A beat that changes one note lights only that note and leaves the others where they are.
interface Beat { q: Quality; set: number; inv: number; view: View; lit?: number[]; pulse?: number; from?: View; alt?: Quality; prevQ?: Quality; reread?: Quality; learn?: boolean; walk?: { r: number; c: number }; th?: DropType }
interface Helpful { topic: string; why: string; href: string | null }
declare const __HELPFUL__: Helpful[];
const HELPFUL: Helpful[] = __HELPFUL__;

const btn = (primary: boolean, disabled: boolean): CSSProperties => ({
  height: CH, borderRadius: RAD, padding: "0 14px", border: BORDER, backgroundColor: primary ? INK : PAGE, color: primary ? PAGE : INK,
  cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1, fontFamily: SANS, fontSize: CFS, fontWeight: 500, lineHeight: "18px",
  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxSizing: "border-box", transition: "opacity 200ms ease",
});
const selectStyle: CSSProperties = { height: CH, width: "100%", boxSizing: "border-box", fontFamily: SANS, fontSize: CFS, fontWeight: 500, color: INK, backgroundColor: PAGE, border: BORDER, borderRadius: RAD, padding: "0 26px 0 12px", lineHeight: "18px", colorScheme: "only light", cursor: "pointer", backgroundImage: "linear-gradient(45deg, transparent 50%, #4d3533 50%), linear-gradient(135deg, #4d3533 50%, transparent 50%)", backgroundPosition: "calc(100% - 15px) 50%, calc(100% - 10px) 50%", backgroundSize: "5px 5px, 5px 5px", backgroundRepeat: "no-repeat" };

export interface Texted { text: ReactNode; sub: string }
// What the lesson's own text builders get: the key, the helpers that make circles and chord names, and the drop type.
export interface TextCtx {
  k: KeyDef; I: string; dt: DropType; maj: Quality;
  cs: (r: string, kind: ChordKind) => string; np: (n: string) => ReactNode; ip: (l: string) => ReactNode; seq: (l: string[]) => ReactNode;
  B: (props: { children: ReactNode }) => ReactNode; sameInv: (inv: number, q: Quality) => ReactNode; toneIvs: (q: Quality, tones: number[]) => string[];
}
// One implementation of the Drop lessons. A lesson folder supplies the drop type (which note drops, which string sets exist), the opening
// string set and inversion, its own wording for the opening, comparison and string-set beats, and its credit link.
export interface DropConfig {
  dt: DropType;
  other?: DropType; // when set, a "Compare" step shows this other drop beside the lesson's own
  title: string; tutKey: string; credit: { href: string; label: string };
  openSet: number; openInv: number;
  texts: (c: TextCtx) => { opening: Texted[]; strings: Texted[]; compare?: Texted[] };
}

export function makeDropLesson(cfg: DropConfig): () => JSX.Element {
  const dt = cfg.dt;
  const DROP_TONE = cfg.openInv;
  const STEP_TONE = dt.order[cfg.openInv][dt.stepVoice];
  const off = cfg.other ? 1 : 0;
const maj = Q("maj7");
// The dim7 chord with its fifth raised but its top note not yet renamed: a minor triad with a double-flat seventh on top.
const MID: Quality = { ...Q("m6"), ls: SEVENTH_LS, kind: "min" };
const bt = (q: Quality, set: number, inv: number, view: View, lit?: number[], pulse?: number, from?: View): Beat => ({ q, set, inv, view, lit, pulse, from });
// The opening picture is the 2nd-inversion Drop 2 chord on strings 5 to 2 (the 5 in the bass), the one that comes straight from a close chord on the top four strings.
const OPEN_SET = cfg.openSet;
const OPEN_INV = cfg.openInv;
const closedDrop = (q: Quality): Beat[] => [bt(q, OPEN_SET, OPEN_INV, "closed"), bt(q, OPEN_SET, OPEN_INV, "skip", undefined, DROP_TONE, "closed"), bt(q, OPEN_SET, OPEN_INV, "drop", undefined, STEP_TONE, "skip")];
const LQ = { dom: Q("dom7"), m7: Q("m7"), hd: Q("hdim"), dim: Q("dim7"), m6: Q("m6"), six: Q("six") };
// The path: lower the 7th, the 3rd, the 5th, the 7th again (dim7), raise the 5th, rename the top note (m6), raise the 3rd (6). Two beats re-read the
// same four dots as the chord built on the 6th (m6 = half-diminished, 6 = minor 7).
const LEARN: (Partial<Beat> & { q: Quality })[] = [
  { q: maj }, { q: LQ.dom, lit: [3], pulse: 3, prevQ: maj }, { q: LQ.m7, lit: [1], pulse: 1, prevQ: LQ.dom }, { q: LQ.hd, lit: [2], pulse: 2, prevQ: LQ.m7 },
  { q: LQ.dim, lit: [3], pulse: 3, prevQ: LQ.hd }, { q: MID, lit: [2], pulse: 2, prevQ: LQ.dim }, { q: LQ.m6, lit: [3], pulse: 3 },
  { q: LQ.m6, lit: [3], pulse: 3, alt: LQ.dim }, { q: LQ.m6 }, { q: LQ.m6, reread: LQ.hd }, { q: LQ.six, lit: [1], pulse: 1, prevQ: LQ.m6 }, { q: LQ.six }, { q: LQ.six, reread: LQ.m7 }, { q: LQ.six },
];
// The chord built on the 6th has the same four notes: the 6th is its root, the root is its 3rd, the 3rd its 5th, the 5th its 7th.
const REL_TONE = [1, 2, 3, 0];
const SPEC: Beat[][] = [
  [bt(maj, OPEN_SET, OPEN_INV, "closed"), bt(maj, OPEN_SET, OPEN_INV, "skip", undefined, DROP_TONE, "closed"), bt(maj, OPEN_SET, OPEN_INV, "drop", undefined, STEP_TONE, "skip"), bt(maj, OPEN_SET, OPEN_INV, "drop")],
  // The comparison (when the lesson has one): the other drop, then this lesson's own, on the same string and the same bass note.
  ...(cfg.other ? [[{ ...bt(maj, 1, 1, "drop"), th: cfg.other }, bt(maj, 1, 1, "drop")]] : []),
  dt.sets.map((set: number): Beat => bt(maj, set, OPEN_INV, "drop")),
  [bt(maj, OPEN_SET, 0, "drop"), bt(maj, OPEN_SET, 1, "drop"), bt(maj, OPEN_SET, 2, "drop"), bt(maj, OPEN_SET, 3, "drop")],
  [...closedDrop(Q("dom7")), ...closedDrop(Q("m7")), ...closedDrop(Q("hdim"))],
  // Learn and practise: from the major 7 chord, one note changes by one fret at a time (the inversion is the learner's to switch).
  LEARN.map((b: Partial<Beat> & { q: Quality }): Beat => ({ ...bt(b.q, OPEN_SET, OPEN_INV, "drop", b.lit, b.pulse), prevQ: b.prevQ, alt: b.alt, reread: b.reread, learn: true })),
  // The ii V i walk: four rounds of three chords, one beat per chord (the chord itself comes from walkChords).
  Array.from({ length: 12 }, (_: unknown, n: number): Beat => ({ ...bt(maj, 1, 0, "drop"), walk: { r: Math.floor(n / 3), c: n % 3 } })),
  [bt(maj, 0, 0, "drop")],
];
const N = (name: string): number => ["Drop", ...(cfg.other ? ["Compare"] : []), "Strings", "Inversions", "Qualities", "Learn", "ii V i", "Explore"].indexOf(name);
const STEP_LABEL = [`Drop ${dt.fromTop}`, ...(cfg.other ? ["Compare"] : []), "Strings", "Inversions", "Qualities", "Learn", "ii V i", "Explore"];
const STEP_TITLE = ["Closed chord, then drop", ...(cfg.other ? [`Drop ${dt.fromTop} against Drop ${cfg.other.fromTop}`] : []), `${dt.sets.length === 3 ? "Three" : "Two"} string sets`, "Four inversions", `Closed, then Drop ${dt.fromTop}, for four chord qualities`, "Learn and practise: one note at a time, from major 7 to 6", "ii V I with Drop chords", "Explore every chord, string set and inversion"];
const EXPLORE = SPEC.length - 1;

// First-time tour: each step lights one control (CSS selector) on the step it lives on (`at` = step, beat).
const TUT_SEEN = cfg.tutKey;
const WORDS = ["", "", "", "", "", "", "Seven", "Eight"];
const FROMTOP = dt.fromTop === 2 ? "second" : "third";
const TUT_STEPS: TutStep[] = [
  { at: [0, 0], live: true, sel: "#drop-board", title: "The fretboard", text: "Six strings and seven frets at a time. Each dot is a note of the chord, and the root is red. Tap a dot to hear it." },
  { at: [0, 0], live: true, sel: ".drop-card p", title: "One idea at a time", text: "Read one sentence at a time. Every note and interval in the text is a circle, like the dots on the board." },
  { at: [0, 0], live: true, sel: "#drop-hear", title: "Hear it", text: "Strums the chord that is on the board." },
  { at: [0, 0], live: true, sel: "#drop-show", title: "Intervals or Names", text: "Switch the dots between intervals ([R] [3] [5] [7]) and note names. The root stays red." },
  { at: [0, 0], live: true, settings: true, sel: 'button[aria-label="Display settings"]', also: "#drop-settings", title: "Settings", text: "Key, Left-handed, Sound, Drone, Show tutorial and Share image live here." },
  { at: [0, 0], sel: 'nav[aria-label="Lesson steps"]', title: "The steps", text: `${WORDS[SPEC.length]} steps. Tap any one to jump straight to it.` },
  { at: [0, 0], sel: "#drop-nav", title: "Back and Continue", text: "Walk through the beats with Continue and Back. The left and right arrow keys work too." },
  { at: [0, 1], live: true, sel: "#drop-board", title: "One dot moves", text: `On the first step the closed chord drops its ${FROMTOP} note from the top, and only that dot moves. The faint ring shows where it came from.` },
  { at: [N("Learn"), 1], live: true, sel: "#drop-board", title: "One note changes", text: "From major 7 to 6, only the dot that changes moves or is renamed, one fret at a time. The others stay exactly where they are." },
  { at: [N("Learn"), 0], live: true, sel: "#drop-learninv", title: "Practise in every inversion", text: "Switch the inversion and run the same path again: Root, 1st, 2nd or 3rd." },
  { at: [N("ii V i"), 0], live: true, sel: "#drop-mode", title: "Minor or major", text: "The walk comes as a minor ii V i or a major one. Pick the bass string below the board, or leave it on the one that stays lowest on the neck." },
  { at: [N("ii V i"), 1], live: true, sel: "#drop-board", title: "Dots that change", text: "On each chord, the dots that move get a ring and leave a dashed ghost where they were. The others stay put." },
  { at: [EXPLORE, 0], live: true, sel: "#drop-quality", title: "Explore: pick a chord", text: `Seven chord qualities, each as a Drop ${dt.fromTop} chord.` },
  { at: [EXPLORE, 0], live: true, sel: "#drop-sets", title: "Bass string", text: `Which string the lowest note is on: string ${dt.sets.map((x: number) => 6 - x).join(" or ")}.` },
  { at: [EXPLORE, 0], live: true, sel: "#drop-inv", title: "Inversion", text: "Which chord tone is lowest: Root, 1st, 2nd or 3rd." },
  { at: [EXPLORE, 0], live: true, sel: "#drop-board", title: "Walk the neck", text: "The arrows at the board\u2019s edges move the same chord to the next place it fits, up or down the neck." },
];

function readSpot(): { card: number; beat: number } {
  const m = /^#s(\d+)(?:b(\d+))?$/.exec(window.location.hash);
  if (!m) return { card: 0, beat: 0 };
  const card = Number(m[1]) - 1;
  if (!(card >= 0 && card < SPEC.length)) return { card: 0, beat: 0 };
  const beat = Number(m[2] ?? 1) - 1;
  return { card, beat: beat >= 0 && beat < SPEC[card].length ? beat : 0 };
}

function App() {
  const [card, setCard] = useState<number>(() => readSpot().card);
  const [beat, setBeat] = useState<number>(() => readSpot().beat);
  const [dir, setDir] = useState<number>(1);
  const [keyId, setKeyId] = useState<string>("C");
  const [show, setShow] = useState<string>("intervals");
  const [lefty, setLefty] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [tut, setTut] = useState<boolean>(false);
  const [sound, setSound] = useState<InstrumentId>("nylon");
  const [playing, setPlaying] = useState<boolean>(false);
  const [droneOn, setDroneOn] = useState<boolean>(false);
  // Explore's picks.
  const [exQ, setExQ] = useState<QId>("maj7");
  const [exSet, setExSet] = useState<number>(0);
  const [exInv, setExInv] = useState<number>(0);
  const [exPos, setExPos] = useState<number>(-1);
  // The ii V i walk: minor or major, and (null = the set with the lowest range for the key) which bass string.
  // Learn: which inversion the one-note-at-a-time path is run in.
  const [learnInv, setLearnInv] = useState<number>(0);
  const [walkMinor, setWalkMinor] = useState<boolean>(false);
  const [walkPick, setWalkPick] = useState<number | null>(null);
  const walkRun = useRef<{ on: boolean }>({ on: false });
  const tutFrom = useRef<{ card: number; beat: number }>({ card: 0, beat: 0 });
  const cardRef = useRef<number>(0);
  const beatRef = useRef<number>(0);
  const openRef = useRef<boolean>(false);
  const rootRef = useRef<HTMLDivElement>(null);
  cardRef.current = card;
  beatRef.current = beat;
  openRef.current = open;

  const total = SPEC.length;
  const go = (i: number, b = 0): void => {
    const t = Math.max(0, Math.min(total - 1, i));
    setCard((c: number) => { setDir(t >= c ? 1 : -1); return t; });
    setBeat(b);
  };
  useEffect(() => {
    try { window.history.replaceState(null, "", `#s${card + 1}${beat > 0 ? `b${beat + 1}` : ""}`); } catch { /* a sandboxed frame may not allow it */ }
  }, [card, beat]);
  useEffect(() => {
    const onHash = (): void => { const sp = readSpot(); setCard(sp.card); setBeat(sp.beat); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const startTutorial = (): void => { tutFrom.current = { card: cardRef.current, beat: beatRef.current }; setOpen(false); setTut(true); };
  const endTutorial = (): void => {
    setTut(false);
    setOpen(false);
    try { window.localStorage.setItem(TUT_SEEN, "1"); } catch { /* private mode: the tour just offers itself again */ }
    go(tutFrom.current.card, tutFrom.current.beat);
  };
  useEffect(() => {
    let seen = false;
    try { seen = window.localStorage.getItem(TUT_SEEN) === "1"; } catch { seen = false; }
    if (seen || navigator.webdriver) return;
    const t = window.setTimeout(() => setTut(true), 900);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => { if (rootRef.current) lockPaint(rootRef.current); });

  // Each step opens on its own deliberate default, not on whatever an earlier step left behind: Learn in root position, Explore in root position
  // on its first bass string, the walk on the bass string with the lowest range. A choice made inside a step sticks until the learner leaves it.
  useEffect(() => {
    if (card === N("Learn")) setLearnInv(0);
    if (card === EXPLORE) { setExInv(0); setExSet(0); setExPos(-1); }
    if (card === N("ii V i")) setWalkPick(null);
  }, [card]);
  useEffect(() => { setLearnInv(0); setExPos(-1); }, [keyId]);
  const k: KeyDef = KEYS.find((x: KeyDef) => x.id === keyId) ?? KEYS[0];
  // The drone is the key's root low down; it follows the Key setting and outlives phrases.
  const droneMidi = 36 + k.pc;
  const toggleDrone = (): void => { if (droneOn) { stopDrone(); setDroneOn(false); } else { startDrone(droneMidi); setDroneOn(true); } };
  useEffect(() => { if (droneOn) startDrone(droneMidi); }, [droneMidi]);
  useEffect(() => () => stopDrone(), []);
  const onExplore = card === EXPLORE;
  const spec0: Beat = onExplore ? { q: Q(exQ), set: exSet, inv: exInv, view: "drop" } : SPEC[card][Math.min(beat, SPEC[card].length - 1)];
  const spec: Beat = spec0.learn ? { ...spec0, inv: learnInv } : spec0;
  const nBeats = SPEC[card].length;

  // The chord on the board: its root, quality and placement. On the ii V i walk it comes from walkChords (a string set picked for the
  // key's lowest range unless the player chooses one).
  const autoSet = useMemo(() => { let best = 0; let bestMax = 99; for (const st of dt.sets) { const m = Math.max(...walkChords(k, walkMinor, st, dt).flat().flatMap((c: ProgChord) => place(c.inst, c.q).frets)); if (m < bestMax) { bestMax = m; best = st; } } return best; }, [keyId, walkMinor]);
  const walkSet = walkPick ?? autoSet;
  const walkData = useMemo(() => walkChords(k, walkMinor, walkSet, dt), [keyId, walkMinor, walkSet]);
  const pc: ProgChord | null = !onExplore && spec.walk ? walkData[spec.walk.r][spec.walk.c] : null;
  const root: RootDef = pc ? pc.root : k;
  const q: Quality = pc ? pc.q : spec.q;
  const list: Inst[] = useMemo(() => instances(k, spec.set, spec.inv, spec.th ?? dt), [keyId, spec.set, spec.inv, spec.th]);
  // Every beat of this step that shows the same chord shape (same string set and inversion) shares one place on the neck and one window,
  // so only the changing dot moves while you read on.
  const group: Beat[] = onExplore || pc ? [spec] : spec.learn ? SPEC[card] : SPEC[card].filter((x: Beat) => x.set === spec.set && x.inv === spec.inv && x.th === spec.th);
  const gq: Quality[] = Array.from(new Set(group.map((x: Beat) => x.q)));
  const gv: View[] = Array.from(new Set(group.map((x: Beat) => x.view)));
  const pos = onExplore ? (exPos >= 0 && exPos < list.length ? exPos : home(list)) : homeFor(list, gq, gv);
  const inst: Inst = pc ? pc.inst : list[pos];
  const pl = place(inst, q);
  const intervals = show === "intervals";
  const I = rootName(k);
  const cs = (r: string, kind: ChordKind): string => chordSymbol(r, kind);
  // The name of the chord on the board: a slash chord when its lowest note is not the root. The close chord (root on the bottom) never is.
  const view: View = onExplore || pc ? "drop" : spec.view;
  // A re-reading beat: the same four dots named as the chord built on the 6th ("Aø7/C": the real lowest note stays the bass).
  const relRoot: RootDef = { pc: (k.pc + 9) % 12, letter: (k.letter + 5) % 7 };
  const bassTone = inst.dt.order[inst.inv][0];
  const name = spec.reread ? chordName(relRoot, spec.reread, REL_TONE[bassTone]) : chordName(root, q, view === "closed" ? 0 : inst.inv);
  const vv: VV[] = viewVoices(inst, q, view) ?? (viewVoices(inst, q, "drop") as VV[]);
  const ghostFrom = !onExplore && spec.pulse !== undefined && spec.prevQ ? (viewVoices(inst, spec.prevQ, view) ?? []).find((x: VV) => x.tone === spec.pulse)
    : !onExplore && spec.pulse !== undefined && spec.from ? (viewVoices(inst, q, spec.from) ?? []).find((x: VV) => x.tone === spec.pulse) : undefined;
  // On the walk the dots are kept by string, so a dot that stays on its fret does not move at all and one that changes slides along its string
  // (with a ring, and a dashed ghost where it was).
  const wk = pc && spec.walk ? spec.walk : null;
  const prevW: ProgChord | null = wk && wk.c > 0 ? walkData[wk.r][wk.c - 1] : null;
  const prevFrets: number[] | null = prevW ? place(prevW.inst, prevW.q).frets : null;
  const voices: Voice[] = wk && pc
    ? pl.frets.map((f: number, j: number): Voice => {
      const tone = inst.dt.order[inst.inv][j];
      const moved = prevFrets !== null && prevFrets[j] !== f;
      return { s: pl.strings[j], f, fill: tone === 0 ? RED : INK, label: intervals ? toneIv(q, tone) : toneNote(root, q, tone), op: 1, halo: moved, ghost: moved && prevFrets ? { s: pl.strings[j], f: prevFrets[j] } : undefined };
    })
    : vv.map((v: VV): Voice => ({
      s: v.s, f: v.f, fill: (spec.reread ? v.tone === 3 : v.tone === 0) ? RED : INK,
      label: intervals ? toneIv(spec.reread ?? q, spec.reread ? REL_TONE[v.tone] : v.tone) : toneNote(root, q, v.tone),
      op: !onExplore && spec.lit && !spec.lit.includes(v.tone) ? 0.3 : 1, halo: !onExplore && (spec.reread ? v.tone === 3 : spec.pulse === v.tone),
      ghost: ghostFrom && spec.pulse === v.tone ? { s: ghostFrom.s, f: ghostFrom.f } : undefined,
      alt: !onExplore && spec.alt && spec.pulse === v.tone ? `also ${intervals ? toneIv(spec.alt, v.tone) : toneNote(root, spec.alt, v.tone)}` : undefined,
    }));
  const walkWin = (): number | null => {
    if (!wk) return null;
    const fr = walkData[wk.r].flatMap((c: ProgChord) => place(c.inst, c.q).frets);
    const lo = Math.min(...fr);
    const hi = Math.max(...fr);
    if (hi - lo > 6) return null;
    let w = Math.max(0, lo - 1);
    if (hi > w + 6) w = hi - 6;
    return Math.max(0, Math.min(w, 18));
  };
  const wl = walkWin() ?? windowFor(inst, gq, gv) ?? windowFor(inst, [q], [view]) ?? 0;

  // Sound: tap a dot to hear it; Hear it strums the chord on the board.
  const playDot = (s: number, f: number): void => { void pluck(OPEN_MIDI[s] + f, 0.8); };
  const playShown = (): void => {
    if (playing) { walkRun.current.on = false; stopAll(); setPlaying(false); return; }
    if (wk) {
      // The walk: strum the round's three chords in time, the board following each one.
      const r = wk.r;
      walkRun.current.on = true;
      setPlaying(true);
      void (async () => {
        for (let c = 0; c < 3 && walkRun.current.on; c++) {
          setBeat(r * 3 + c);
          const ch = walkData[r][c];
          await playPhrase({ notes: place(ch.inst, ch.q).pitches, style: "strum" });
          if (walkRun.current.on) await new Promise<void>((res: () => void) => window.setTimeout(res, 350));
        }
        walkRun.current.on = false;
        setPlaying(false);
      })();
      return;
    }
    setPlaying(true);
    void playPhrase({ notes: vv.map((v: VV) => v.pitch), style: "strum" }).then(() => setPlaying(false));
  };
  useEffect(() => { if (walkRun.current.on) return; stopAll(); setPlaying(false); }, [card, beat, keyId, show, exQ, exSet, exInv, exPos, walkMinor, walkPick]);

  // Explore: the arrows step the same chord to the next place on the neck where it fits.
  const stepPos = (d: number): void => { const t = pos + d; if (t >= 0 && t < list.length) setExPos(t); };
  const canPos = (d: number): boolean => { const t = pos + d; return t >= 0 && t < list.length; };

  const next = (): void => { if (beat < nBeats - 1) { setDir(1); setBeat(beat + 1); } else go(card === total - 1 ? 0 : card + 1); };
  const prev = (): void => { if (beat > 0) { setDir(-1); setBeat(beat - 1); return; } if (card > 0) go(card - 1, SPEC[card - 1].length - 1); };
  const navRef = useRef<{ next: () => void; prev: () => void; step: (d: number) => void }>({ next: () => {}, prev: () => {}, step: () => {} });
  navRef.current = { next, prev, step: (d: number) => stepPos(lefty ? -d : d) };
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "SELECT" || t.tagName === "INPUT" || t.getAttribute("role") === "radio" || t.getAttribute("role") === "checkbox")) return;
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      if (cardRef.current === EXPLORE) navRef.current.step(d);
      else if (d > 0) navRef.current.next();
      else navRef.current.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The words. Every note and interval is a circle (Pip); chord names are bold and set like a lead sheet.
  const ip = (label: string): ReactNode => <Pip key={label} label={label} root={I} />;
  const np = (n: string): ReactNode => <Pip key={n} label={n} root={I} />;
  const seq = (labels: string[]): ReactNode => labels.map((l: string, i: number) => <span key={i}>{i > 0 ? " " : ""}<Pip label={l} root={I} /></span>);
  const B = (props: { children: ReactNode }): ReactNode => <strong style={{ fontWeight: 700 }}>{chordChildren(props.children)}</strong>;
  const toneIvs = (qq: Quality, tones: number[]): string[] => tones.map((t: number) => toneIv(qq, t));
  const sameInv = (inv: number, qq: Quality): ReactNode => seq(toneIvs(qq, dt.order[inv]));
  const rel = (): string => cs(spellAt(k, 5, 9), "m7");
  const m6 = Q("m6");
  const six = Q("six");
  const dim = Q("dim7");
  // The closed-then-drop trio for one chord quality: the quality's own interval names for the notes that change.
  const trio = (qq: Quality, was: string, now: string): { text: ReactNode; sub: string }[] => {
    const nm = chordName(k, qq);
    return [
      { text: <><B>{nm}</B> stacked as a closed chord: the {ip(was)} becomes {ip(now)}. Same top four strings.</>, sub: "closed position" },
      { text: <>Drop the {FROMTOP} note from the top, the {ip(toneIv(qq, DROP_TONE))}, down an octave, onto string {6 - OPEN_SET}.</>, sub: "the dropped note" },
      { text: <>Step the {ip(toneIv(qq, STEP_TONE))} across to string {6 - dt.final(OPEN_SET)[dt.stepVoice]}. {dt.fromTop === 2 ? "Four neighbouring strings again." : "The three upper notes sit on neighbouring strings."}</>, sub: `Drop ${dt.fromTop}` },
    ];
  };
  // The walk's twelve beats: round r (ii in inversion r), then the V and the tonic voiced closest to the chord before them.
  const ROMAN = walkMinor ? ["ii", "V", "i"] : ["ii", "V", "I"];
  const TONIC = walkMinor ? "the minor 6 chord" : "the major 7 chord";
  const walkBeats: { text: ReactNode; sub: string; head?: string }[] = walkData.flatMap((round: ProgChord[], r: number) => round.map((c: ProgChord, i: number) => {
    const nm = chordName(c.root, c.q, c.inst.inv);
    const head = `ii V ${walkMinor ? "i" : "I"}, round ${r + 1} of 4.`;
    const fr = place(c.inst, c.q).frets;
    const pf = i > 0 ? place(round[i - 1].inst, round[i - 1].q).frets : null;
    const moved = pf ? fr.filter((f: number, j: number) => f !== pf[j]).length : 0;
    const how = moved === 4 ? "Every dot moves, but only a short way." : moved === 1 ? "Only one dot moves; the rest stay put." : `${moved === 2 ? "Two" : "Three"} dots move; the rest stay put.`;
    const inv = INV_NAMES[c.inst.inv].toLowerCase();
    const text: ReactNode = i === 0
      ? <>Round {r + 1}: the ii chord, <B>{nm}</B>, in {inv}.{r > 0 ? " One step further up the neck." : ""}</>
      : i === 1 ? <>Next, the V chord, <B>{nm}</B>. {how}</>
      : <>Home on {TONIC}, <B>{nm}</B>. {how}</>;
    return { text, sub: `${ROMAN[i]} \u00b7 ${INV_NAMES[c.inst.inv]}`, head };
  }));
  const texts = cfg.texts({ k, I, dt, maj, cs, np, ip, seq, B, sameInv, toneIvs });
  const script: { head: string; beats: { text: ReactNode; sub: string; head?: string }[] }[] = [
    { head: "Closed, then drop.", beats: texts.opening },
    ...(cfg.other ? [{ head: `Drop ${dt.fromTop} or Drop ${cfg.other.fromTop}?`, beats: texts.compare as Texted[] }] : []),
    { head: "String sets.", beats: texts.strings },
    { head: "Inversions.", beats: [
      { text: <>Every Drop {dt.fromTop} chord is named for its lowest note. In root position that is {ip("R")}: {sameInv(0, maj)}.</>, sub: INV_NAMES[0] },
      { text: <>1st inversion has the third in the bass: {sameInv(1, maj)}.</>, sub: INV_NAMES[1] },
      { text: <>2nd inversion has the fifth in the bass: {sameInv(2, maj)}.</>, sub: INV_NAMES[2] },
      { text: <>3rd inversion has the seventh in the bass: {sameInv(3, maj)}. Four inversions, four places on the neck.</>, sub: INV_NAMES[3] },
    ] },
    { head: "Four chord qualities.", beats: [...trio(Q("dom7"), "7", "\u266d7"), ...trio(Q("m7"), "3", "\u266d3"), ...trio(Q("hdim"), "5", "\u266d5")] },
    { head: "One note at a time.", beats: [
      { text: <>Start from <B>{cs(I, "maj7")}</B>: {seq(toneIvs(maj, [0, 1, 2, 3]))}. Every beat from here changes one note by one fret.</>, sub: "major seventh" },
      { text: <>Lower the {ip("7")} a fret, to {ip("\u266d7")}: <B>{cs(I, "dom7")}</B>, the dominant.</>, sub: "dominant seventh" },
      { text: <>Lower the {ip("3")}, to {ip("\u266d3")}: <B>{cs(I, "m7")}</B>.</>, sub: "minor seventh" },
      { text: <>Lower the {ip("5")}, to {ip("\u266d5")}: <B>{cs(I, "hdim")}</B>, half-diminished.</>, sub: "half-diminished" },
      { text: <>Lower the {ip("\u266d7")} once more, to {ip("\u266d\u266d7")}: <B>{cs(I, "dim7")}</B>, built in minor thirds.</>, sub: "diminished seventh" },
      { text: <>Now go back up: raise the {ip("\u266d5")} to {ip("5")}, {np(toneNote(k, dim, 2))} to {np(toneNote(k, m6, 2))}. One note is still to rename.</>, sub: "one note still to rename" },
      { text: <>The top note stays put: same fret, same sound. Only its name changes, {ip("\u266d\u266d7")} to {ip("6")}, {np(toneNote(k, dim, 3))} to {np(toneNote(k, m6, 3))}. That is <B>{cs(I, "m6")}</B>.</>, sub: "same fret, new name" },
      { text: <>That is called enharmonic: two names for one pitch. We use the one that fits the chord, {ip("\u266d\u266d7")} in a diminished chord, {ip("6")} in a minor 6.</>, sub: "two names, one pitch" },
      { text: <>Here is <B>{cs(I, "m6")}</B> counted from {np(I)}: {seq(toneIvs(m6, [0, 1, 2, 3]))}. The root is red.</>, sub: "counted from the root" },
      { text: <>Same four dots, nothing moved. Only the point of view did: counted from {np(spellAt(k, 5, 9))} it is <B>{cs(spellAt(k, 5, 9), "hdim")}</B>, {seq(toneIvs(Q("hdim"), [0, 1, 2, 3]))}. Learn one shape, get both.</>, sub: "the same notes, read from the 6th" },
      { text: <>Raise the {ip("\u266d3")} to {ip("3")}, {np(toneNote(k, m6, 1))} to {np(toneNote(k, six, 1))}: <B>{cs(I, "six")}</B>.</>, sub: "major six" },
      { text: <>Here is <B>{cs(I, "six")}</B> counted from {np(I)}: {seq(toneIvs(six, [0, 1, 2, 3]))}. The root is red.</>, sub: "counted from the root" },
      { text: <>Same four dots again. Counted from {np(spellAt(k, 5, 9))} it is <B>{rel()}</B>, {seq(toneIvs(Q("m7"), [0, 1, 2, 3]))}. Two chords, one shape.</>, sub: "the same notes, read from the 6th" },
      { text: <>Practise: run the whole path in each inversion (switch above), then in another key. Say each change out loud as you play it.</>, sub: "practice" },
    ] },
    { head: `ii V ${walkMinor ? "i" : "I"}.`, beats: walkBeats },
    { head: "Explore.", beats: [{ text: <>Pick a chord, a string set and an inversion. The arrows walk it up the neck.</>, sub: "" }] },
  ];
  const sc = script[card];
  const cb = sc.beats[Math.min(beat, sc.beats.length - 1)];
  const nameTitle = name;
  const nameSub = onExplore ? `${INV_NAMES[exInv]} · ${BASS_LABELS[exSet]}` : cb.sub;

  const sharePng = (): void => {
    const svg = document.getElementById("drop-board") as SVGSVGElement | null;
    if (!svg) return;
    const file = `${asciiName(nameTitle)}-${INV_NAMES[inst.inv].toLowerCase().replace(/\s+/g, "")}-${asciiName(BASS_LABELS[inst.set])}.png`;
    void shareBoard({ svg, title: nameTitle, subtitle: nameSub, fileName: file });
  };

  const css = ":root,html,body{color-scheme:only light!important;background:#fdfcfb!important;color:#4d3533!important;margin:0}"
    + " html body #drop-root#drop-root,html body #drop-root#drop-root div,html body #drop-root#drop-root p,html body #drop-root#drop-root h1,html body #drop-root#drop-root h2{color-scheme:only light!important}"
    + " html body #drop-root#drop-root h1,html body #drop-root#drop-root h2,html body #drop-root#drop-root p,html body #drop-root#drop-root li{color:#4d3533!important}"
    + " #drop-root button,#drop-root select{-webkit-appearance:none;appearance:none;margin:0;font-family:inherit}"
    + " #drop-root button:focus-visible,#drop-root select:focus-visible{outline:2px solid #0f766e;outline-offset:2px}"
    + " #drop-root .drop-btn:hover:not(:disabled){filter:brightness(.96)} #drop-root .drop-btn-primary:hover:not(:disabled){filter:brightness(1.15)}"
    + ""
    + " @media (max-width:340px){#drop-root .drop-step span:last-child{font-size:9px!important;letter-spacing:-.1px} #drop-root nav[aria-label='Lesson steps']{gap:1px!important}}"
    + " @media (max-width:380px){#drop-root .drop-step span:last-child{font-size:10px!important}}"
    + " @font-face{font-family:'MuseJazz Text';src:url('" + SITE_ROOT + "fonts/MuseJazzText.otf') format('opentype');font-display:swap}"
    + " @font-face{font-family:'MuseJazz Text';src:url('" + SITE_ROOT + "fonts/MuseJazz.otf') format('opentype');unicode-range:U+266D,U+266F;font-display:swap}"
    + " @keyframes drop-lbl{from{opacity:0}to{opacity:1}}"
    + " @keyframes drop-r{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}} @keyframes drop-l{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}"
    + " @keyframes drop-halo{0%{opacity:0;transform:scale(.7)}30%{opacity:1;transform:scale(1)}100%{opacity:.35;transform:scale(1.12)}}"
    + " #drop-root .drop-halo{transform-box:fill-box;transform-origin:center;animation:drop-halo 900ms ease-out 2 both}"
    + " @media (prefers-reduced-motion:reduce){#drop-root .drop-halo{animation:none}}"
    + " @media (hover:hover){#drop-root .drop-arrow:hover:not(:disabled) svg{opacity:.6} #drop-root .drop-icon:hover svg{opacity:.6}} #drop-root .drop-icon svg{transition:opacity 150ms ease}"
    + " html,body{max-width:100%} #drop-root{overflow-x:clip;max-width:100vw} #drop-root svg{max-width:100%}" + STICKY_CSS;

  const head = (t: string): ReactNode => <h2 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 400, lineHeight: "26px", letterSpacing: "-0.4px", color: INK, backgroundColor: PAGE, margin: 0 }}>{chordify(t)}</h2>;
  const line = (t: ReactNode): ReactNode => <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 350, lineHeight: "20px", letterSpacing: "-0.14px", color: INK, backgroundColor: PAGE, margin: 0 }}>{t}</p>;
  const beatDots: ReactNode = nBeats > 1 ? (
    <div role="img" aria-label={`Part ${beat + 1} of ${nBeats}`} style={{ display: "flex", gap: 5, height: 8, alignItems: "center", backgroundColor: PAGE }}>
      {Array.from({ length: nBeats }, (_: unknown, i: number) => <span key={i} style={{ width: i === beat ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i <= beat ? TEAL : LINE, transition: "width 220ms ease, background-color 220ms ease" }} />)}
    </div>
  ) : <div style={{ height: 8 }} />;
  const iconBtn = (id: string, label: string, onClick: () => void, children: ReactNode, extra?: CSSProperties): ReactNode => (
    <button type="button" className="drop-icon" id={id} aria-label={label} onClick={onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 32, minWidth: 32, padding: 0, margin: 0, flex: "0 0 auto", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", color: INK, backgroundColor: PAGE, ...extra }}>{children}</button>
  );
  const settingsToggle = (
    <button type="button" className="drop-icon" aria-label="Display settings" aria-controls="drop-settings" aria-expanded={open} onClick={() => setOpen(!open)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 3, height: 32, minWidth: 32, padding: 0, margin: 0, flex: "0 0 auto", border: 0, borderRadius: 0, boxShadow: "none", outlineOffset: 2, cursor: "pointer", color: INK, backgroundColor: PAGE }}>
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
  const textLink: CSSProperties = { padding: 0, border: 0, boxShadow: "none", cursor: "pointer", font: "inherit", color: INK2, backgroundColor: PAGE, textDecoration: "underline", textUnderlineOffset: 2 };
  const pill = (
    <div role="radiogroup" id="drop-show" aria-label="Label the dots" style={{ display: "inline-flex", flexDirection: "column", flex: "0 0 auto", border: `1px solid ${LINE_UI}`, borderRadius: 9, overflow: "hidden", boxSizing: "border-box", backgroundColor: PAGE }}>
      {[["notes", "Names"], ["intervals", "Intervals"]].map(([v, lb]: string[]) => (
        <button key={v} type="button" role="radio" aria-checked={show === v} onClick={() => setShow(v)} style={{ height: 14, padding: "0 10px", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", fontFamily: SANS, fontSize: 9.5, fontWeight: 600, lineHeight: "14px", color: show === v ? PAGE : INK, backgroundColor: show === v ? INK : PAGE, transition: "background-color 200ms ease, color 200ms ease" }}>{lb}</button>
      ))}
    </div>
  );
  const tabs = (label: string, o: { value: string; label: string }[], v: string, on: (x: string) => void, id: string, size = 12.5): ReactNode => (
    <div id={id} style={{ minWidth: 0, flex: 1, backgroundColor: PAGE }}><Tabs label={label} options={o} value={v} onChange={on} size={size} height={36} /></div>
  );

  return (
    <div ref={rootRef} id="drop-root" style={{ backgroundColor: PAGE, color: INK, colorScheme: "only light", minHeight: "100vh", width: "100%", padding: "12px 16px 16px", fontFamily: SANS, boxSizing: "border-box" }}>
      <style>{css}</style>
      <div style={{ maxWidth: 640, margin: "0 auto", backgroundColor: PAGE, color: INK, display: "flex", flexDirection: "column", gap: 8 }}>
        <StickyHeader>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, backgroundColor: PAGE }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 400, lineHeight: "26px", letterSpacing: "-0.5px", color: INK, backgroundColor: PAGE, margin: 0 }}>{cfg.title}</h1>
          <a href={SITE_ROOT} style={{ flex: "0 0 auto", fontFamily: SANS, fontSize: 12.5, lineHeight: "16px", color: INK2, backgroundColor: PAGE, textDecoration: "none" }}>{"← All lessons"}</a>
        </div>
        <nav aria-label="Lesson steps" style={{ display: "grid", gridTemplateColumns: STEP_LABEL.map((lb: string) => `minmax(28px,${lb.length + 2}fr)`).join(" "), gap: 3, backgroundColor: PAGE }}>
          {STEP_LABEL.map((lb: string, i: number) => (
            <button key={lb} type="button" className="drop-step" aria-label={`Step ${i + 1} of ${total}: ${STEP_TITLE[i]}`} aria-current={i === card ? "step" : undefined} onClick={() => go(i)} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5, height: 32, minWidth: 0, padding: "2px 0", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", color: INK, backgroundColor: PAGE }}>
              <span style={{ display: "block", height: 4, borderRadius: 2, backgroundColor: i <= card ? TEAL : LINE, transition: "background-color 300ms ease" }} />
              <span style={{ display: "block", fontFamily: SANS, fontSize: 11, lineHeight: "14px", fontWeight: i === card ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textAlign: "center", color: i === card ? INK : INK2, backgroundColor: PAGE }}>{lb}</span>
            </button>
          ))}
        </nav>
        </StickyHeader>
        {/* Every beat of the step is laid out invisibly in the same cell, so the card is as tall as the step's longest text and the board never moves within a step. */}
        <div className="drop-card" style={{ position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", backgroundColor: PAGE }}>
          <div key={`card${card}-${beat}`} style={{ gridArea: "1 / 1", alignSelf: "end", display: "flex", flexDirection: "column", gap: 4, animation: `${dir > 0 ? "drop-r" : "drop-l"} 340ms ${EASE} both`, backgroundColor: PAGE }}>
            {beatDots}{head(cb.head ?? sc.head)}{line(cb.text)}
          </div>
          {sc.beats.map((b, i: number) => <div key={i} aria-hidden="true" style={{ gridArea: "1 / 1", alignSelf: "end", visibility: "hidden", display: "flex", flexDirection: "column", gap: 4 }}>{beatDots}{head(b.head ?? sc.head)}{line(b.text)}</div>)}
        </div>

        {/* Explore has three control rows; the guided steps have two (Hear it, then the settings row), plus a first row on the ii V i step for the Minor / Major switch. */}
        {onExplore || wk ? (
        <div style={{ height: 36, display: "flex", alignItems: "center", gap: 8, backgroundColor: PAGE }}>
          {onExplore
            ? tabs("Chord", QUALITIES.map((x: Quality) => ({ value: x.id, label: chordName(k, x) })), exQ, (v: string) => setExQ(v as QId), "drop-quality", 11.5)
            : <><div style={{ flex: 1, minWidth: 0 }} />
              {wk ? (
                <div role="radiogroup" id="drop-mode" aria-label="Minor or major ii V" style={{ display: "inline-flex", flex: "0 0 auto", border: `1px solid ${LINE_UI}`, borderRadius: 11, overflow: "hidden", boxSizing: "border-box", backgroundColor: PAGE }}>
                  {[["minor", "Minor"], ["major", "Major"]].map(([v, lb]: string[]) => (
                    <button key={v} type="button" role="radio" aria-checked={(v === "minor") === walkMinor} onClick={() => setWalkMinor(v === "minor")} style={{ height: 22, padding: "0 10px", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", fontFamily: SANS, fontSize: 11, fontWeight: 600, lineHeight: "22px", color: (v === "minor") === walkMinor ? PAGE : INK, backgroundColor: (v === "minor") === walkMinor ? INK : PAGE, transition: "background-color 200ms ease, color 200ms ease" }}>{lb}</button>
                  ))}
                </div>
              ) : null}</>}
        </div>
        ) : null}
        {onExplore ? (
          <div style={{ height: 36, display: "flex", alignItems: "center", gap: 8, backgroundColor: PAGE }}>
            {tabs("Bass string", dt.sets.map((s: number) => ({ value: String(s), label: BASS_LABELS[s] })), String(exSet), (v: string) => { setExSet(Number(v)); setExPos(-1); }, "drop-sets", 12)}
          </div>
        ) : null}
        <div style={{ height: 36, display: "flex", alignItems: "center", gap: 10, backgroundColor: PAGE }}>
          {onExplore
            ? tabs("Inversion", [0, 1, 2, 3].map((i: number) => ({ value: String(i), label: ["Root", "1st", "2nd", "3rd"][i] })), String(exInv), (v: string) => { setExInv(Number(v)); setExPos(-1); }, "drop-inv")
            : spec.learn ? tabs("Inversion", [0, 1, 2, 3].map((i: number) => ({ value: String(i), label: ["Root", "1st", "2nd", "3rd"][i] })), String(learnInv), (v: string) => setLearnInv(Number(v)), "drop-learninv")
            : wk ? tabs("Bass string", dt.sets.map((st: number) => ({ value: String(st), label: BASS_LABELS[st].replace("Bass on String", "String") })), String(walkSet), (v: string) => setWalkPick(Number(v)), "drop-walkset", 12)
            : <div style={{ flex: 1 }} />}
          {pill}
          {settingsToggle}
        </div>

        <div id="drop-settings" aria-hidden={!open} style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0, marginTop: open ? 0 : -8, visibility: open ? "visible" : "hidden", transition: `grid-template-rows 280ms ${EASE}, margin-top 280ms ${EASE}, opacity 220ms ease, visibility 0s linear ${open ? 0 : 280}ms`, backgroundColor: PAGE }}>
          <div style={{ minHeight: 0, overflow: "hidden", backgroundColor: PAGE }}>
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, backgroundColor: PAGE, color: INK, border: `1px solid ${LINE}`, borderRadius: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center", backgroundColor: PAGE }}>
                <select id="drop-key" aria-label="Key" value={keyId} onChange={(e: ChangeEvent<HTMLSelectElement>) => { setKeyId(e.target.value); setExPos(-1); }} style={selectStyle}>
                  {KEYS.map((x: KeyDef) => <option key={x.id} value={x.id} style={{ color: INK, backgroundColor: PAGE }}>{`Key of ${flat(x.id)}`}</option>)}
                </select>
                <button type="button" role="checkbox" aria-checked={lefty} onClick={() => setLefty(!lefty)} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: CH, backgroundColor: PAGE, border: 0, padding: 0, cursor: "pointer", fontFamily: SANS, fontSize: CFS, lineHeight: "18px", color: INK, whiteSpace: "nowrap" }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, border: BORDER, backgroundColor: lefty ? INK : PAGE, color: PAGE, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, lineHeight: "12px", boxSizing: "border-box" }}>{lefty ? "✓" : ""}</span>
                  <span style={{ color: INK, backgroundColor: PAGE }}>Left-handed</span>
                </button>
              </div>
              <select id="drop-sound" aria-label="Sound" value={sound} onChange={(e: ChangeEvent<HTMLSelectElement>) => { const id = e.target.value as InstrumentId; setSound(id); setInstrument(id); }} style={selectStyle}>
                {INSTRUMENTS.map((i: { id: InstrumentId; label: string }) => <option key={i.id} value={i.id} style={{ color: INK, backgroundColor: PAGE }}>{i.label}</option>)}
              </select>
              <button type="button" className="drop-btn" id="drop-drone" aria-pressed={droneOn} style={btn(droneOn, false)} onClick={toggleDrone}>{droneOn ? `\u25a0 Drone on ${flat(keyId)}` : `\u25b6 Drone on ${flat(keyId)}`}</button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, backgroundColor: PAGE }}>
                <button type="button" className="drop-btn" id="drop-settings-tutorial" style={btn(false, false)} onClick={startTutorial}>Show tutorial</button>
                <button type="button" className="drop-btn" id="drop-share" aria-label="Share this diagram as an image" style={btn(false, false)} onClick={sharePng}>Share image</button>
              </div>
              {HELPFUL.length > 0 ? (
                <div style={{ backgroundColor: PAGE, fontFamily: SANS, fontSize: 12.5, lineHeight: "18px", color: INK2 }}>
                  <button type="button" aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)} style={textLink}>{helpOpen ? "Helps to know ▴" : "Helps to know ▾"}</button>
                  {helpOpen ? <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3, backgroundColor: PAGE }}>
              {HELPFUL.map((h: Helpful) => <li key={h.topic} style={{ backgroundColor: PAGE }}>{h.href ? <a href={SITE_ROOT + h.href} style={{ color: INK, backgroundColor: PAGE }}>{chordify(h.topic)}</a> : <span style={{ color: INK, backgroundColor: PAGE }}>{chordify(h.topic)}</span>}: {chordify(h.why)}</li>)}
            </ul> : null}
                </div>
              ) : null}
              <p id="drop-credit" style={{ margin: 0, fontFamily: SANS, fontSize: 11.5, lineHeight: "16px", color: INK2, backgroundColor: PAGE }}>
          Further reading: <a href={cfg.credit.href} target="_blank" rel="noopener noreferrer" style={{ color: INK2, backgroundColor: PAGE }}>{cfg.credit.label}</a>
        </p>
            </div>
          </div>
        </div>

        <div id="drop-name" aria-live="polite" style={{ position: "relative", display: "flex", justifyContent: "center", minHeight: onExplore ? 48 : 61, padding: "14px 36px 0", boxSizing: "border-box", backgroundColor: PAGE, textAlign: "center" }}>
          <div style={{ minWidth: 0, backgroundColor: PAGE }}>
            <div id="drop-name-title" style={{ fontFamily: REALBOOK, fontSize: nameTitle.length > 12 ? 26 : 32, fontWeight: 400, lineHeight: "34px", letterSpacing: 0, color: INK, backgroundColor: PAGE, minHeight: 34 }}>{titleNodes(nameTitle, 1)}</div>
            {onExplore ? null : <div id="drop-name-sub" style={{ marginTop: 2, fontFamily: SANS, fontSize: 13, fontWeight: 400, lineHeight: "16px", minHeight: 16, color: INK2, backgroundColor: PAGE }}>{nameSub}</div>}
          </div>
          {iconBtn("drop-share-quick", "Share this diagram as an image", sharePng, (
            <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" style={{ display: "block" }}>
              <path d="M9 11.5 V2.5 M5.8 5.5 L9 2.3 L12.2 5.5 M3.5 9 V14.5 H14.5 V9" fill="none" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: INK }} />
            </svg>
          ), { position: "absolute", right: 0, top: 9, width: 32 })}
        </div>

        <div style={{ position: "relative", backgroundColor: PAGE }}>
          <Board voices={voices} wl={wl} lefty={lefty} onPlay={playDot} />
          {(onExplore ? [-1, 1] : []).map((d: number) => {
            const ok = canPos(d);
            const onLeft = lefty ? d > 0 : d < 0;
            return (
              <button key={d} type="button" className="drop-arrow" aria-label={d < 0 ? "Previous place, down the neck" : "Next place, up the neck"} disabled={!ok} onClick={() => stepPos(d)} style={{ position: "absolute", top: "calc(45.5% - 28px)", height: 56, width: 36, borderRadius: 8, [onLeft ? "left" : "right"]: -16, display: "flex", alignItems: "center", justifyContent: onLeft ? "flex-start" : "flex-end", padding: "0 3px", border: 0, boxShadow: "none", cursor: ok ? "pointer" : "default", opacity: ok ? 1 : 0.22, transition: "opacity 200ms ease", color: INK, backgroundColor: "transparent" }}>
                <svg width={12} height={22} viewBox="0 0 12 22" aria-hidden="true" style={{ display: "block" }}>
                  <path d={onLeft ? "M9 3 L3 11 L9 19" : "M3 3 L9 11 L3 19"} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: INK }} />
                </svg>
              </button>
            );
          })}
        </div>
        {/* Under the diagram, so the sound is one tap from what is being looked at. */}
        <button type="button" className="drop-btn" id="drop-hear" aria-pressed={playing} onClick={playShown} style={{ ...btn(false, false), width: "100%", height: 36 }}>{playing ? "■ Stop" : wk ? "▶ Play the round" : "▶ Hear it"}</button>
        <div id="drop-nav" className="agt-bottombar" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, backgroundColor: PAGE }}>
          <button type="button" className="drop-btn" style={{ ...btn(false, card === 0 && beat === 0), height: 44, fontSize: 15 }} disabled={card === 0 && beat === 0} onClick={prev}>{"← Back"}</button>
          <button type="button" className="drop-btn drop-btn-primary" style={{ ...btn(true, false), height: 44, fontSize: 15 }} onClick={next}>{card === total - 1 ? "Start over" : "Continue →"}</button>
        </div>
      </div>
      {tut ? <Tutorial steps={TUT_STEPS} onStep={(st: TutStep): boolean => { const at = st.at ?? [0, 0]; const wantOpen = st.settings === true; const moved = at[0] !== cardRef.current || at[1] !== beatRef.current || wantOpen !== openRef.current; go(at[0], at[1]); setOpen(wantOpen); return moved; }} onClose={endTutorial} /> : null}
    </div>
  );
}

  return App;
}
