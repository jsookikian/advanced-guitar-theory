import { useState, useEffect, useRef } from "grok/canvas";
import type { CSSProperties, ChangeEvent, ReactNode } from "grok/canvas";
import { pluck, playPhrase, stopAll, setInstrument, startDrone, stopDrone, INSTRUMENTS } from "../../shared/audio";
import type { InstrumentId } from "../../shared/audio";
import { SITE_ROOT } from "../../shared/site-root";
import Tutorial from "../../shared/Tutorial";
import type { TutStep } from "../../shared/Tutorial";
import { Pip } from "../../shared/pip";
import { KEYS, flat, chordify, chordChildren, titleNodes, chordSymbol, asciiName } from "../../shared/notation";
import type { KeyDef } from "../../shared/notation";
import { INK, INK2, PAGE, LINE, LINE_UI, TEAL, RED, SERIF, REALBOOK, SANS, EASE, Tabs, lockPaint, StickyHeader, STICKY_CSS } from "../../shared/ui";
import { shareBoard } from "../../shared/share";
import Board from "../../shared/drop/Board";
import type { Voice } from "../../shared/drop/Board";
import { Q, chordName, toneNote, toneIv, spellAt, INV_NAMES, BASS_LABELS, OPEN_MIDI } from "../../shared/drop/theory";
import type { Quality, Inst } from "../../shared/drop/theory";
import { SUS7, PAIRS, chordRoot, makeInst, pairPositions, leadPair, susName, windowFor, frets as gripFrets, strings as gripStrings, pitches as gripPitches, tones as gripTones } from "./theory";
import type { PairPos } from "./theory";

// Drop 2 voicings of 7sus4 chords in A Dorian: each is a Drop 2 dominant 7 with its 3rd raised a fret to the 4th (all four inversions on the top strings,
// then the middle and low string sets), then D7sus4 and A7sus4 as a pair whose notes G and A stay while C and D each step up a whole tone, the pair walked
// up the neck, and played over Am7 to D7. The theory (grips, pairs) is computed in theory.ts on top of the shared Drop engine; this file is the screen.
// The voicings are our own, not read off the video.
interface Helpful { topic: string; why: string; href: string | null }
declare const __HELPFUL__: Helpful[];
const HELPFUL: Helpful[] = __HELPFUL__;

const CH = 36;
const RAD = 10;
const CFS = 13.5;
const BORDER = `1px solid ${INK}`;
const btn = (primary: boolean, disabled: boolean): CSSProperties => ({
  height: CH, borderRadius: RAD, padding: "0 14px", border: BORDER, backgroundColor: primary ? INK : PAGE, color: primary ? PAGE : INK,
  cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1, fontFamily: SANS, fontSize: CFS, fontWeight: 500, lineHeight: "18px",
  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxSizing: "border-box", transition: "opacity 200ms ease",
});
const selectStyle: CSSProperties = { height: CH, width: "100%", boxSizing: "border-box", fontFamily: SANS, fontSize: CFS, fontWeight: 500, color: INK, backgroundColor: PAGE, border: BORDER, borderRadius: RAD, padding: "0 26px 0 12px", lineHeight: "18px", colorScheme: "only light", cursor: "pointer", backgroundImage: "linear-gradient(45deg, transparent 50%, #4d3533 50%), linear-gradient(135deg, #4d3533 50%, transparent 50%)", backgroundPosition: "calc(100% - 15px) 50%, calc(100% - 10px) 50%", backgroundSize: "5px 5px, 5px 5px", backgroundRepeat: "no-repeat" };

// What a beat shows. `sc` is the scene: a dominant 7 or its 7sus4 in one inversion on one string set ("make"), the starting pair ("lead"), a position of the
// walk ("walk"), the vamp, or Explore. `who` is the first (a, D7sus4) or second (b, A7sus4) chord of the pair. `pv` is what the dots came from (its changed
// dots get a ring and a dashed ghost). `q` is the quality: the make beats show the dominant 7, then the 7sus4 with its 3rd raised to the 4th, and the
// vamp turns the 4th back into a 3rd.
type Who = "a" | "b";
type QK = "sus" | "m7" | "dom7";
interface Beat { sc: "lead" | "make" | "walk" | "vamp" | "explore"; who: Who; q?: QK; base?: QK; pv?: { who: Who; q?: QK }; set?: number; rel?: number; inv?: number; pos?: number; over?: 0 | 5; fall?: boolean; reread?: boolean }

const STEP_LABEL = ["Make it", "Strings", "Pair", "Walk", "Vamp", "Roots", "Explore"];
const STEP_TITLE = ["Raise the 3rd of a Drop 2 dominant 7 to the 4th", "The same move on the middle and low strings", "Two chords, two notes move", "Walk the pair up the neck", "Play it over Am7 to D7", "Which roots work in this mode", "Explore every string set and pair"];
// The four inversions in the order they climb the neck on the top strings (1st, 2nd, 3rd, then root position an octave up).
const MAKE_ORDER = [1, 2, 3, 0];
const MAKE = 0; const STRINGS = 1; const PAIR_STEP = 2; const WALK = 3; const VAMP = 4; const ROOTS = 5; const EXPLORE = 6;
const TOTAL = STEP_LABEL.length;

function buildBeats(walkN: number): Beat[][] {
  const lead = (who: Who, pv?: Who): Beat => ({ sc: "lead", who, pv: pv ? { who: pv } : undefined });
  const make = (set: number, inv: number, q: QK): Beat => ({ sc: "make", who: "a", rel: 5, set, inv, q, pv: q === "sus" ? { who: "a", q: "dom7" } : undefined });
  const root = (rel: number, q: QK): Beat => ({ sc: "make", who: "a", rel, set: 2, inv: 1, q, base: "m7", pv: q === "sus" ? { who: "a", q: "m7" } : undefined });
  const vamp = (who: Who, q: QK, over: 0 | 5, pv?: QK, extra: Partial<Beat> = {}): Beat => ({ sc: "vamp", who, q, over, pv: pv ? { who, q: pv } : undefined, ...extra });
  return [
    MAKE_ORDER.flatMap((inv: number): Beat[] => [make(2, inv, "dom7"), make(2, inv, "sus")]),
    [make(1, 0, "dom7"), make(1, 0, "sus"), make(0, 0, "dom7"), make(0, 0, "sus")],
    [lead("a"), lead("b", "a"), lead("a", "b")],
    Array.from({ length: walkN * 2 }, (_: unknown, n: number): Beat => ({ sc: "walk", who: n % 2 === 0 ? "a" : "b", pv: n % 2 === 1 ? { who: "a" } : undefined, pos: Math.floor(n / 2) })),
    [vamp("b", "m7", 0), vamp("b", "sus", 0, "m7"), vamp("a", "dom7", 5), vamp("a", "sus", 5, "dom7"), vamp("a", "dom7", 5, "sus", { fall: true }), vamp("a", "sus", 0, undefined, { reread: true })],
    [root(2, "m7"), root(2, "sus"), root(7, "m7"), root(7, "sus"), root(7, "sus")],
    [{ sc: "explore", who: "a" }],
  ];
}

const TUT_SEEN = "agt-sus-chords-tutorial-seen";
const TUT_STEPS: TutStep[] = [
  { at: [0, 0], live: true, sel: "#drop-board", title: "The fretboard", text: "Six strings and seven frets at a time. Each dot is a note of the chord, and the root is red. Tap a dot to hear it." },
  { at: [0, 0], live: true, sel: ".drop-card p", title: "One idea at a time", text: "Read one sentence at a time. Every note and interval in the text is a circle, like the dots on the board." },
  { at: [0, 0], live: true, sel: "#drop-hear", title: "Hear it", text: "Strums the chord that is on the board." },
  { at: [0, 0], live: true, settings: true, sel: 'button[aria-label="Display settings"]', also: "#drop-settings", title: "Settings", text: "Key, Left-handed, Sound, Drone, Show tutorial and Share image live here." },
  { at: [0, 0], sel: 'nav[aria-label="Lesson steps"]', title: "The steps", text: "Seven steps. Tap any one to jump straight to it." },
  { at: [0, 0], sel: "#drop-nav", title: "Back and Continue", text: "Walk through the beats with Continue and Back. The left and right arrow keys work too." },
  { at: [PAIR_STEP, 1], live: true, sel: "#drop-board", title: "Two dots move", text: "Only the changed dots move. The rings and the dashed ghosts show where they came from." },
  { at: [MAKE, 1], live: true, sel: "#drop-board", title: "One dot moves", text: "A Drop 2 dominant 7 becomes a 7sus4 when its 3rd steps up a fret to the 4th. The ring and the dashed ghost show where it came from." },
  { at: [WALK, 0], live: true, sel: "#drop-walkset", title: "Walk the neck", text: "The pair repeats up the neck. Pick which strings it sits on." },
  { at: [EXPLORE, 0], live: true, sel: "#drop-sets", title: "Explore: string set", text: "Which string the lowest note is on." },
  { at: [EXPLORE, 0], live: true, sel: "#drop-pair", title: "Explore: chord pair", text: "Which two 7sus4 chords, a fifth apart. Switch between them below to see the two dots that move." },
  { at: [EXPLORE, 0], live: true, sel: "#drop-board", title: "Walk the neck", text: "The arrows at the board’s edges move to the next position up or down the neck." },
];

function App() {
  const readSpot = (): { card: number; beat: number } => {
    const m = /^#s(\d+)(?:b(\d+))?$/.exec(window.location.hash);
    if (!m) return { card: 0, beat: 0 };
    const c = Number(m[1]) - 1;
    if (!(c >= 0 && c < TOTAL)) return { card: 0, beat: 0 };
    const b = Number(m[2] ?? 1) - 1;
    return { card: c, beat: b >= 0 ? b : 0 };
  };
  const [card, setCard] = useState<number>(() => readSpot().card);
  const [beat, setBeat] = useState<number>(() => readSpot().beat);
  const [dir, setDir] = useState<number>(1);
  const [keyId, setKeyId] = useState<string>("A");
  const [show, setShow] = useState<string>("intervals");
  const [lefty, setLefty] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [tut, setTut] = useState<boolean>(false);
  const [sound, setSound] = useState<InstrumentId>("nylon");
  const [playing, setPlaying] = useState<boolean>(false);
  const [droneOn, setDroneOn] = useState<boolean>(false);
  const [walkSet, setWalkSet] = useState<number>(2);
  const [exSet, setExSet] = useState<number>(2);
  const [exPair, setExPair] = useState<number>(0);
  const [exChord, setExChord] = useState<number>(0);
  const [exPos, setExPos] = useState<number>(0);
  const run = useRef<{ on: boolean }>({ on: false });
  const tutFrom = useRef<{ card: number; beat: number }>({ card: 0, beat: 0 });
  const cardRef = useRef<number>(0);
  const beatRef = useRef<number>(0);
  const openRef = useRef<boolean>(false);
  const rootRef = useRef<HTMLDivElement>(null);
  cardRef.current = card;
  beatRef.current = beat;
  openRef.current = open;

  const k: KeyDef = KEYS.find((x: KeyDef) => x.id === keyId) ?? KEYS[0];
  const walkList: PairPos[] = pairPositions(k, 0, walkSet);
  const BEATS: Beat[][] = buildBeats(walkList.length);
  const nBeats = BEATS[card].length;
  const bi = Math.min(beat, nBeats - 1);
  const onExplore = card === EXPLORE;

  const go = (i: number, b = 0): void => {
    const t = Math.max(0, Math.min(TOTAL - 1, i));
    setCard((c: number) => { setDir(t >= c ? 1 : -1); return t; });
    setBeat(b);
  };
  useEffect(() => {
    try { window.history.replaceState(null, "", `#s${card + 1}${bi > 0 ? `b${bi + 1}` : ""}`); } catch { /* a sandboxed frame may not allow it */ }
  }, [card, bi]);
  useEffect(() => {
    const onHash = (): void => { const sp = readSpot(); setCard(sp.card); setBeat(sp.beat); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { if (beat > nBeats - 1) setBeat(nBeats - 1); }, [nBeats]);
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
  // Each step opens on its own deliberate default; a choice made inside a step sticks until the learner leaves it.
  useEffect(() => { if (card === EXPLORE) { setExPos(0); setExChord(0); } }, [card]);
  useEffect(() => { setExPos(0); }, [keyId, exPair]);

  // The drone is the key's root low down; it follows the Key setting and outlives phrases.
  const droneMidi = 36 + k.pc;
  const toggleDrone = (): void => { if (droneOn) { stopDrone(); setDroneOn(false); } else { startDrone(droneMidi); setDroneOn(true); } };
  useEffect(() => { if (droneOn) startDrone(droneMidi); }, [droneMidi]);
  useEffect(() => () => stopDrone(), []);

  // ---- The chord on the board -------------------------------------------------------------------------------------------
  const lp: PairPos = leadPair(k);
  const exList: PairPos[] = pairPositions(k, exPair, exSet);
  const exPi = Math.min(exPos, exList.length - 1);
  // Moving to another string set keeps the voicing: the same inversion of the first chord, nearest along the neck to where it was.
  const nearestPos = (list: PairPos[], from: PairPos): number => {
    let best = 0;
    let bd = Infinity;
    list.forEach((q: PairPos, i: number) => { const dd = (q.a.inv === from.a.inv ? 0 : 100) + Math.abs(q.lo - from.lo); if (dd < bd) { bd = dd; best = i; } });
    return best;
  };
  const QOF: Record<QK, Quality> = { sus: SUS7, m7: Q("m7"), dom7: Q("dom7") };
  const spec: Beat = onExplore ? { sc: "explore", who: exChord === 0 ? "a" : "b", pv: exChord === 1 ? { who: "a" } : undefined } : BEATS[card][bi];
  // The pair a beat draws from, and the chords' roots (semitones above the key) in it.
  const pairIdx = spec.sc === "explore" ? exPair : 0;
  const relOfWho = (w: Who, pr = pairIdx): number => PAIRS[pr][w === "a" ? 0 : 1];
  const pp: PairPos = spec.sc === "walk" ? walkList[spec.pos as number] : spec.sc === "explore" ? exList[exPi] : lp;
  const instOfWho = (w: Who, p: PairPos = pp): Inst => (w === "a" ? p.a : p.b);
  // Make beats pick their own voicing: the lowest one in the beat's inversion and string set that also fits on the neck as a dominant 7.
  const makeI = spec.sc === "make" ? makeInst(k, spec.rel as number, spec.set as number, spec.inv as number, QOF[spec.base ?? "dom7"]) : undefined;
  const inst: Inst = makeI ?? instOfWho(spec.who);
  const rel = spec.sc === "make" ? (spec.rel as number) : relOfWho(spec.who);
  const root = chordRoot(k, rel);
  const q: Quality = QOF[spec.q ?? "sus"];
  const intervals = show === "intervals";

  // The voices on the board, kept by string, so a changed fret slides along its string and the rest stay.
  const IV: Record<number, string> = { 0: "R", 3: "♭3", 5: "4", 7: "5", 10: "♭7" };
  const tn = gripTones(inst);
  const prevInst: Inst | null = spec.pv ? (spec.sc === "make" ? inst : instOfWho(spec.pv.who)) : null;
  const prevQ: Quality = QOF[spec.pv?.q ?? "sus"];
  const prevF: number[] | null = prevInst ? gripFrets(prevInst, prevQ) : null;
  const curF = gripFrets(inst, q);
  const curS = gripStrings(inst);
  const labelOf = (tone: number, pitch: number): string => {
    if (spec.reread) return intervals ? IV[(pitch - k.pc + 120) % 12] : toneNote(root, q, tone);
    return intervals ? toneIv(q, tone) : toneNote(root, q, tone);
  };
  const isRoot = (tone: number, pitch: number): boolean => (spec.reread ? (pitch - k.pc + 120) % 12 === 0 : tone === 0);
  const voices: Voice[] = curF.map((f: number, j: number): Voice => {
    const moved = prevF !== null && prevF[j] !== f;
    const pitch = gripPitches(inst, q)[j];
    return { s: curS[j], f, fill: isRoot(tn[j], pitch) ? RED : INK, label: labelOf(tn[j], pitch), op: 1, halo: moved, ghost: moved && prevF ? { s: curS[j], f: prevF[j] } : undefined };
  });
  const winFrets: number[] = spec.sc === "make" ? [...gripFrets(inst), ...gripFrets(inst, QOF[spec.base ?? "dom7"])]
    : spec.sc === "vamp" ? [...gripFrets(lp.a), ...gripFrets(lp.b), ...gripFrets(lp.a, QOF.dom7), ...gripFrets(lp.b, QOF.m7)]
      : spec.sc === "lead" || spec.sc === "walk" || spec.sc === "explore" ? [...gripFrets(pp.a), ...gripFrets(pp.b)] : gripFrets(inst);
  const wl = windowFor(winFrets);

  // Names: a 7sus4 is its own symbol over its lowest note; the vamp's minor 7 and dominant 7 come from the engine.
  const nameOf = (w: Who, qq: QK, p: PairPos, set = inst.set): string => {
    const ii = instOfWho(w, p);
    const r = relOfWho(w);
    return qq === "sus" ? susName(k, r, ii.inv) : chordName(chordRoot(k, r), QOF[qq], ii.inv);
  };
  const name = spec.sc === "make" ? (spec.q === "sus" ? susName(k, rel, inst.inv) : chordName(root, q, inst.inv))
    : spec.sc === "vamp" ? nameOf(spec.who, spec.q ?? "sus", lp)
      : nameOf(spec.who, "sus", pp);

  // ---- Sound ------------------------------------------------------------------------------------------------------------
  const playDot = (s: number, f: number): void => { void pluck(OPEN_MIDI[s] + f, 0.8); };
  const pedal = (r: number): number => 40 + ((k.pc + r - 4 + 12) % 12);
  const playShown = (): void => {
    if (playing) { run.current.on = false; stopAll(); setPlaying(false); return; }
    if (spec.sc === "walk") {
      const p = spec.pos as number;
      run.current.on = true;
      setPlaying(true);
      void (async () => {
        for (let c = 0; c < 2 && run.current.on; c++) {
          setBeat(p * 2 + c);
          await playPhrase({ notes: gripPitches(c === 0 ? walkList[p].a : walkList[p].b), style: "strum" });
          if (run.current.on) await new Promise<void>((res: () => void) => window.setTimeout(res, 350));
        }
        run.current.on = false;
        setPlaying(false);
      })();
      return;
    }
    setPlaying(true);
    void playPhrase({ notes: gripPitches(inst, q), bass: spec.over !== undefined ? pedal(spec.over) : undefined, style: "strum" }).then(() => setPlaying(false));
  };
  useEffect(() => { if (run.current.on) return; stopAll(); setPlaying(false); }, [card, beat, keyId, show, walkSet, exSet, exPair, exChord, exPos]);

  const stepPos = (d: number): void => { const t = exPi + d; if (t >= 0 && t < exList.length) setExPos(t); };
  const canPos = (d: number): boolean => { const t = exPi + d; return t >= 0 && t < exList.length; };
  const next = (): void => { if (bi < nBeats - 1) { setDir(1); setBeat(bi + 1); } else go(card === TOTAL - 1 ? 0 : card + 1); };
  const prev = (): void => { if (bi > 0) { setDir(-1); setBeat(bi - 1); return; } if (card > 0) go(card - 1, buildBeats(walkList.length)[card - 1].length - 1); };
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

  // ---- The words ---------------------------------------------------------------------------------------------------------
  const I = spellAt(k, 0, 0);
  const np = (n: string): ReactNode => <Pip key={n} label={n} root={I} />;
  const ip = (l: string): ReactNode => <Pip key={l} label={l} root={I} />;
  const list = (ns: string[]): ReactNode => ns.map((n: string, i: number) => <span key={i}>{i > 0 ? " " : ""}<Pip label={n} root={I} /></span>);
  const B = (props: { children: ReactNode }): ReactNode => <strong style={{ fontWeight: 700 }}>{chordChildren(props.children)}</strong>;
  const notesOf = (ii: Inst, r: number, qq: Quality = SUS7): string[] => gripTones(ii).map((t: number) => toneNote(chordRoot(k, r), qq, t));
  const ivsOf = (ii: Inst, qq: Quality = SUS7): string[] => gripTones(ii).map((t: number) => toneIv(qq, t));
  // The dots that change between two grips of one pair: the note each leaves and the one it lands on, and the notes that stay.
  const changes = (a: Inst, ra: number, b: Inst, rb: number): { moves: { from: string; to: string }[]; stay: string[] } => {
    const fa = gripFrets(a); const fb = gripFrets(b); const na = notesOf(a, ra); const nb = notesOf(b, rb);
    return { moves: fa.map((f: number, j: number) => ({ f, j })).filter((x: { f: number; j: number }) => x.f !== fb[x.j]).map((x: { f: number; j: number }) => ({ from: na[x.j], to: nb[x.j] })), stay: na.filter((_: string, j: number) => fa[j] === fb[j]) };
  };
  const nA = susName(k, relOfWho("a", 0), lp.a.inv);
  const nB = susName(k, relOfWho("b", 0), lp.b.inv);
  const lead = changes(lp.a, relOfWho("a", 0), lp.b, relOfWho("b", 0));
  const mv = (m: { from: string; to: string }): ReactNode => <>{np(m.from)} to {np(m.to)}</>;
  const wpos = (spec.pos ?? 0);
  const wc = spec.sc === "walk" ? changes(pp.a, relOfWho("a", 0), pp.b, relOfWho("b", 0)) : lead;
  const range = `frets ${pp.lo} to ${pp.hi}`;
  const dName = chordSymbol(spellAt(chordRoot(k, 5), 0, 0), "dom7sus4");
  const aName = chordSymbol(I, "dom7sus4");
  const am7 = chordSymbol(I, "m7");
  const d7 = chordSymbol(spellAt(chordRoot(k, 5), 0, 0), "dom7");
  const F3 = toneNote(chordRoot(k, 5), Q("dom7"), 1);
  const C3 = toneNote(chordRoot(k, 0), Q("m7"), 1);

  type Say = { text: ReactNode; sub: string };
  // The make beats: a Drop 2 dominant 7 in one inversion, then the same voicing with its 3rd raised a fret to the 4th.
  const makeSay = (set: number, inv: number, toSus: boolean, first: boolean): Say => {
    const ii = makeInst(k, 5, set, inv) as Inst;
    const dRoot = chordRoot(k, 5);
    const iv = toneIv(QOF.dom7, gripTones(ii)[0]);
    const sub = set === 2 ? INV_NAMES[inv] : BASS_LABELS[set];
    if (!toSus) {
      const nm = chordName(dRoot, QOF.dom7, inv);
      const where = set === 2 ? "on the top four strings" : set === 1 ? "one string set lower, with the bass on string 5" : "on the lowest strings, with the bass on string 6";
      const lead = first ? <>Start with a Drop 2 dominant 7 {where}: </> : set === 2 ? <>Next inversion: </> : <>Same chord, {where}: </>;
      return { text: <>{lead}<B>{nm}</B>{inv === 0 ? " in root position" : <>, the {ip(iv)} in the bass</>}: {list(notesOf(ii, 5, QOF.dom7))} from the bass up.</>, sub };
    }
    const lowered = toneNote(dRoot, QOF.dom7, 1);
    const raised = toneNote(dRoot, SUS7, 1);
    return { text: <>Raise the {ip("3")}, {np(lowered)}, one fret to the {ip("4")}, {np(raised)}: <B>{susName(k, 5, inv)}</B>. Nothing else moves.</>, sub };
  };
  // The Roots beats: the 7sus4 on the other roots that fit the mode (B and E), each made from the minor 7 it stands in for.
  const rootsSay = (n: number): Say => {
    if (n === 4) return { text: <>So a 7sus4 fits on {list([chordRoot(k, 0), chordRoot(k, 2), chordRoot(k, 5), chordRoot(k, 7)].map((r) => spellAt(r, 0, 0)))} in this mode: it stands in for {chordify(am7)}, {chordify(chordName(chordRoot(k, 2), QOF.m7, 0))}, {chordify(d7)} and {chordify(chordName(chordRoot(k, 7), QOF.m7, 0))}. On {list([spellAt(k, 2, 3), spellAt(k, 5, 9), spellAt(k, 6, 10)])} it would need a note outside the scale.</>, sub: "the roots that fit" };
    const rel = n < 2 ? 2 : 7;
    const ii = makeInst(k, rel, 2, 1, QOF.m7) as Inst;
    const r = chordRoot(k, rel);
    if (n % 2 === 0) return { text: <>{n === 0 ? "It works on other roots too. " : ""}The {n === 0 ? "ii" : "v"} chord of the mode is <B>{chordName(r, QOF.m7, 1)}</B>: {list(notesOf(ii, rel, QOF.m7))} from the bass up.</>, sub: n === 0 ? "the ii chord" : "the v chord" };
    return { text: <>Swap the {np(toneNote(r, QOF.m7, 1))}, the {ip("♭3")}, for the {ip("4")}, {np(toneNote(r, SUS7, 1))}: <B>{susName(k, rel, 1)}</B>. Every note is in the scale.</>, sub: "minor 7 to 7sus4" };
  };
  const walkSay = (n: number): Say => {
    const where = `Position ${wpos + 1} of ${walkList.length}`;
    if (n % 2 === 0) return { text: <>{where}. <B>{susName(k, relOfWho("a", 0), pp.a.inv)}</B> on {range}: {list(notesOf(pp.a, relOfWho("a", 0)))} from the bass up.</>, sub: `${where} · ${range}` };
    return { text: <><B>{susName(k, relOfWho("b", 0), pp.b.inv)}</B>: {wc.moves.map((m: { from: string; to: string }, i: number) => <span key={i}>{i > 0 ? " and " : ""}{mv(m)}</span>)}. Two whole steps, the rest stay.</>, sub: `${where} · two whole steps` };
  };
  const SCRIPT: { head: string; beats: Say[] }[] = [
    { head: "Make it.", beats: MAKE_ORDER.flatMap((inv: number, i: number): Say[] => [makeSay(2, inv, false, i === 0), makeSay(2, inv, true, false)]) },
    { head: "Down the strings.", beats: [makeSay(1, 0, false, false), makeSay(1, 0, true, false), makeSay(0, 0, false, false), makeSay(0, 0, true, false)] },
    { head: "Two chords, two moves.", beats: [
      { text: <>Now the pair. <B>{nA}</B>: {list(notesOf(lp.a, 5))} from the bass up. Every 7sus4 is {list(["R", "4", "5", "♭7"])}; here the {ip("4")} is lowest.</>, sub: INV_NAMES[lp.a.inv] },
      { text: <>Next to it <B>{nB}</B>: {list(notesOf(lp.b, 0))}. Two dots move a whole step, {mv(lead.moves[0])} and {mv(lead.moves[1])}. {list(lead.stay)} stay put.</>, sub: "two whole steps" },
      { text: <>And back. The {list(lead.stay)} never leave, and the other two step up and down. Two chords, one colour.</>, sub: "two whole steps" },
    ] },
    { head: "Walk the neck.", beats: Array.from({ length: walkList.length * 2 }, (_: unknown, n: number) => walkSay(n)) },
    { head: "Over Am7 to D7.", beats: [
      { text: <>The vamp is <B>{am7}</B> then <B>{d7}</B>, two bars each. Over <B>{am7}</B>, here is its Drop 2: {list(notesOf(lp.b, 0, QOF.m7))}.</>, sub: "over Am7" },
      { text: <>Swap the {np(C3)} for a {np(toneNote(chordRoot(k, 0), SUS7, 1))}: <B>{nB}</B>. One dot, two frets. Same bar, new colour.</>, sub: "minor 7 to 7sus4" },
      { text: <>Over <B>{d7}</B>, here is its Drop 2: {list(notesOf(lp.a, 5, QOF.dom7))}.</>, sub: "over D7" },
      { text: <>Swap the {np(F3)} for the {np(toneNote(chordRoot(k, 5), SUS7, 1))}, one fret up: <B>{nA}</B>.</>, sub: "7 to 7sus4" },
      { text: <>Then let the {np(toneNote(chordRoot(k, 5), SUS7, 1))} fall back to the {np(F3)}. The tension resolves into <B>{d7}</B>.</>, sub: "the 4th falls to the 3rd" },
      { text: <>One more way to hear it. Counted from {np(I)}, <B>{nA}</B> is {list(["R", "♭3", "4", "♭7"])}: {chordify(am7)} with an added 11 and no 5th.</>, sub: "over A" },
    ] },
    { head: "Which roots.", beats: [0, 1, 2, 3, 4].map(rootsSay) },
    { head: "Explore.", beats: [{ text: <>Pick the strings and a pair of chords. Switch between the two, and the arrows walk it up the neck.</>, sub: "" }] },
  ];
  const sc = SCRIPT[card];
  const cb: Say = sc.beats[Math.min(bi, sc.beats.length - 1)];
  const exWhich = exChord === 0 ? "a" : "b";
  const nameSub = onExplore ? `Position ${exPi + 1} of ${exList.length} · ${BASS_LABELS[exSet]}` : cb.sub;

  const sharePng = (): void => {
    const svg = document.getElementById("drop-board") as SVGSVGElement | null;
    if (!svg) return;
    void shareBoard({ svg, title: name, subtitle: nameSub, fileName: `${asciiName(name)}-${INV_NAMES[inst.inv].toLowerCase().replace(/\s+/g, "")}-${asciiName(BASS_LABELS[inst.set])}.png` });
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
    <div role="img" aria-label={`Part ${bi + 1} of ${nBeats}`} style={{ display: "flex", gap: nBeats > 12 ? 3 : 5, height: 8, alignItems: "center", backgroundColor: PAGE }}>
      {Array.from({ length: nBeats }, (_: unknown, i: number) => <span key={i} style={{ width: i === bi ? 16 : nBeats > 12 ? 5 : 6, height: 6, borderRadius: 3, backgroundColor: i <= bi ? TEAL : LINE, transition: "width 220ms ease, background-color 220ms ease" }} />)}
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
  const setTabs = (v: number, on: (n: number) => void, id: string, long = false): ReactNode => tabs("String set", [0, 1, 2].map((i: number) => ({ value: String(i), label: long ? BASS_LABELS[i] : BASS_LABELS[i].replace("Bass on String", "String") })), String(v), (x: string) => on(Number(x)), id, 12);
  const pairName = (pr: number, w: 0 | 1): string => chordSymbol(spellAt(chordRoot(k, PAIRS[pr][w]), 0, 0), "dom7sus4");
  const pairLabels = PAIRS.map((_: unknown, pr: number) => `${pairName(pr, 0)} \u2194 ${pairName(pr, 1)}`);

  return (
    <div ref={rootRef} id="drop-root" style={{ backgroundColor: PAGE, color: INK, colorScheme: "only light", minHeight: "100vh", width: "100%", padding: "12px 16px 16px", fontFamily: SANS, boxSizing: "border-box" }}>
      <style>{css}</style>
      <div style={{ maxWidth: 640, margin: "0 auto", backgroundColor: PAGE, color: INK, display: "flex", flexDirection: "column", gap: 8 }}>
        <StickyHeader>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, backgroundColor: PAGE }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 400, lineHeight: "26px", letterSpacing: "-0.5px", color: INK, backgroundColor: PAGE, margin: 0 }}>{`Sus Chords in ${flat(keyId)} Dorian`}</h1>
          <a href={SITE_ROOT} style={{ flex: "0 0 auto", fontFamily: SANS, fontSize: 12.5, lineHeight: "16px", color: INK2, backgroundColor: PAGE, textDecoration: "none" }}>{"← All lessons"}</a>
        </div>
        <nav aria-label="Lesson steps" style={{ display: "grid", gridTemplateColumns: STEP_LABEL.map((lb: string) => `minmax(28px,${lb.length + 2}fr)`).join(" "), gap: 3, backgroundColor: PAGE }}>
          {STEP_LABEL.map((lb: string, i: number) => (
            <button key={lb} type="button" className="drop-step" aria-label={`Step ${i + 1} of ${TOTAL}: ${STEP_TITLE[i]}`} aria-current={i === card ? "step" : undefined} onClick={() => go(i)} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5, height: 32, minWidth: 0, padding: "2px 0", border: 0, borderRadius: 0, boxShadow: "none", cursor: "pointer", color: INK, backgroundColor: PAGE }}>
              <span style={{ display: "block", height: 4, borderRadius: 2, backgroundColor: i <= card ? TEAL : LINE, transition: "background-color 300ms ease" }} />
              <span style={{ display: "block", fontFamily: SANS, fontSize: 11, lineHeight: "14px", fontWeight: i === card ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textAlign: "center", color: i === card ? INK : INK2, backgroundColor: PAGE }}>{lb}</span>
            </button>
          ))}
        </nav>
        </StickyHeader>
        {/* Every beat of the step is laid out invisibly in the same cell, so the card is as tall as the step's longest text and the board never moves within a step. */}
        <div className="drop-card" style={{ position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", backgroundColor: PAGE }}>
          <div key={`card${card}-${bi}`} style={{ gridArea: "1 / 1", alignSelf: "end", display: "flex", flexDirection: "column", gap: 4, animation: `${dir > 0 ? "drop-r" : "drop-l"} 340ms ${EASE} both`, backgroundColor: PAGE }}>
            {beatDots}{head(sc.head)}{line(cb.text)}
          </div>
          {sc.beats.map((b, i: number) => <div key={i} aria-hidden="true" style={{ gridArea: "1 / 1", alignSelf: "end", visibility: "hidden", display: "flex", flexDirection: "column", gap: 4 }}>{beatDots}{head(sc.head)}{line(b.text)}</div>)}
        </div>

        {/* Explore has three control rows (string set, chord pair, chord); the guided steps have two (Hear it, then the settings row). */}
        {onExplore ? (
          <div style={{ height: 36, display: "flex", alignItems: "center", gap: 8, backgroundColor: PAGE }}>
            {setTabs(exSet, (n: number) => { setExPos(nearestPos(pairPositions(k, exPair, n), exList[exPi])); setExSet(n); }, "drop-sets", true)}
          </div>
        ) : null}
        {onExplore ? (
          <div style={{ height: 36, display: "flex", alignItems: "center", gap: 8, backgroundColor: PAGE }}>
            {tabs("Chord pair", pairLabels.map((l: string, i: number) => ({ value: String(i), label: l })), String(exPair), (v: string) => { setExPair(Number(v)); setExChord(0); }, "drop-pair", 10.5)}
          </div>
        ) : null}
        <div style={{ height: 36, display: "flex", alignItems: "center", gap: 10, backgroundColor: PAGE }}>
          {onExplore
            ? tabs("Chord", [pairName(exPair, 0), pairName(exPair, 1)].map((l: string, i: number) => ({ value: String(i), label: l })), String(exChord), (v: string) => setExChord(Number(v)), "drop-chord")
            : card === WALK ? setTabs(walkSet, (n: number) => { setBeat(nearestPos(pairPositions(k, 0, n), walkList[Math.min(spec.pos ?? 0, walkList.length - 1)]) * 2 + (bi % 2)); setWalkSet(n); }, "drop-walkset") : <div style={{ flex: 1 }} />}
          {onExplore ? pill : null}
          {settingsToggle}
        </div>

        <div id="drop-settings" aria-hidden={!open} style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0, marginTop: open ? 0 : -8, visibility: open ? "visible" : "hidden", transition: `grid-template-rows 280ms ${EASE}, margin-top 280ms ${EASE}, opacity 220ms ease, visibility 0s linear ${open ? 0 : 280}ms`, backgroundColor: PAGE }}>
          <div style={{ minHeight: 0, overflow: "hidden", backgroundColor: PAGE }}>
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, backgroundColor: PAGE, color: INK, border: `1px solid ${LINE}`, borderRadius: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center", backgroundColor: PAGE }}>
                <select id="drop-key" aria-label="Key" value={keyId} onChange={(e: ChangeEvent<HTMLSelectElement>) => { setKeyId(e.target.value); setExPos(0); }} style={selectStyle}>
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
              <button type="button" className="drop-btn" id="drop-drone" aria-pressed={droneOn} style={btn(droneOn, false)} onClick={toggleDrone}>{droneOn ? `■ Drone on ${flat(keyId)}` : `▶ Drone on ${flat(keyId)}`}</button>
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
          Further reading: <a href="https://youtu.be/AQ_mUG8oCNQ" target="_blank" rel="noopener noreferrer" style={{ color: INK2, backgroundColor: PAGE }}>How to use sus chords in your everyday playing (video)</a>
        </p>
            </div>
          </div>
        </div>

        <div id="drop-name" aria-live="polite" style={{ position: "relative", display: "flex", justifyContent: "center", minHeight: onExplore ? 48 : 61, padding: "14px 36px 0", boxSizing: "border-box", backgroundColor: PAGE, textAlign: "center" }}>
          <div style={{ minWidth: 0, backgroundColor: PAGE }}>
            <div id="drop-name-title" style={{ fontFamily: REALBOOK, fontSize: name.length > 12 ? 26 : 32, fontWeight: 400, lineHeight: "34px", letterSpacing: 0, color: INK, backgroundColor: PAGE, minHeight: 34 }}>{titleNodes(name, 1)}</div>
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
              <button key={d} type="button" className="drop-arrow" aria-label={d < 0 ? "Previous position, down the neck" : "Next position, up the neck"} disabled={!ok} onClick={() => stepPos(d)} style={{ position: "absolute", top: "calc(45.5% - 28px)", height: 56, width: 36, borderRadius: 8, [onLeft ? "left" : "right"]: -16, display: "flex", alignItems: "center", justifyContent: onLeft ? "flex-start" : "flex-end", padding: "0 3px", border: 0, boxShadow: "none", cursor: ok ? "pointer" : "default", opacity: ok ? 1 : 0.22, transition: "opacity 200ms ease", color: INK, backgroundColor: "transparent" }}>
                <svg width={12} height={22} viewBox="0 0 12 22" aria-hidden="true" style={{ display: "block" }}>
                  <path d={onLeft ? "M9 3 L3 11 L9 19" : "M3 3 L9 11 L3 19"} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: INK }} />
                </svg>
              </button>
            );
          })}
        </div>
        {/* Under the diagram, so the sound is one tap from what is being looked at. */}
        <button type="button" className="drop-btn" id="drop-hear" aria-pressed={playing} onClick={playShown} style={{ ...btn(false, false), width: "100%", height: 36 }}>{playing ? "■ Stop" : spec.sc === "walk" ? "▶ Play the position" : "▶ Hear it"}</button>
        <div id="drop-nav" className="agt-bottombar" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, backgroundColor: PAGE }}>
          <button type="button" className="drop-btn" style={{ ...btn(false, card === 0 && bi === 0), height: 44, fontSize: 15 }} disabled={card === 0 && bi === 0} onClick={prev}>{"← Back"}</button>
          <button type="button" className="drop-btn drop-btn-primary" style={{ ...btn(true, false), height: 44, fontSize: 15 }} onClick={next}>{card === TOTAL - 1 ? "Start over" : "Continue →"}</button>
        </div>
      </div>
      {tut ? <Tutorial steps={TUT_STEPS} onStep={(st: TutStep): boolean => { const at = st.at ?? [0, 0]; const wantOpen = st.settings === true; const moved = at[0] !== cardRef.current || at[1] !== beatRef.current || wantOpen !== openRef.current; go(at[0], at[1]); setOpen(wantOpen); return moved; }} onClose={endTutorial} /> : null}
    </div>
  );
}
export default App;
