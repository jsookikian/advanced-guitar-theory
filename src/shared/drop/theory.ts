import { LETTERS, NATURAL, chordSymbol, simpleBass } from "../notation";
import type { ChordKind } from "../notation";

// Pure music theory for the Drop 2 lesson: spelling, chord qualities and the voicings, all computed from the key.
// A chord root is a letter and a pitch class (so a ii or V chord can be spelled from its own letter).
export interface RootDef { pc: number; letter: number }

export const OPEN_PC = [4, 9, 2, 7, 11, 4];
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
export const STR_NAMES = ["E", "A", "D", "G", "B", "e"];
export const MAXF = 24;

// Spell the note that is `ls` letters above the root and `semis` semitones above it: the letter is fixed by the interval number, the accidental by the pitch.
export function spellAt(r: RootDef, ls: number, semis: number): string {
  const l = (r.letter + ls) % 7;
  const pc = (r.pc + semis) % 12;
  const diff = ((pc - NATURAL[l] + 18) % 12) - 6;
  const acc = diff === -2 ? "♭♭" : diff === -1 ? "♭" : diff === 1 ? "♯" : diff === 2 ? "♯♯" : "";
  return LETTERS[l] + acc;
}
const MAJOR_AT = [0, 2, 4, 5, 7, 9, 11];
// Interval name of a note `ls` letters and `semis` semitones above the root (R, 3, ♭3, ♭♭7, 6...).
export function ivAt(ls: number, semis: number): string {
  if (ls === 0 && semis === 0) return "R";
  const diff = semis - MAJOR_AT[ls];
  return (diff < 0 ? "♭".repeat(-diff) : "♯".repeat(diff)) + String(ls + 1);
}

export type QId = "maj7" | "dom7" | "m7" | "hdim" | "dim7" | "m6" | "six";
// A four-note chord: the semitones above the root of its four tones (root, third, fifth, and the seventh or the sixth) and the letters they sit on.
export interface Quality { id: QId; offs: number[]; ls: number[]; kind?: ChordKind }
const SEVENTH = [0, 2, 4, 6];
const SIXTH = [0, 2, 4, 5];
export const QUALITIES: Quality[] = [
  { id: "maj7", offs: [0, 4, 7, 11], ls: SEVENTH },
  { id: "dom7", offs: [0, 4, 7, 10], ls: SEVENTH },
  { id: "m7", offs: [0, 3, 7, 10], ls: SEVENTH },
  { id: "hdim", offs: [0, 3, 6, 10], ls: SEVENTH },
  { id: "dim7", offs: [0, 3, 6, 9], ls: SEVENTH },
  { id: "m6", offs: [0, 3, 7, 9], ls: SIXTH },
  { id: "six", offs: [0, 4, 7, 9], ls: SIXTH },
];
export const Q = (id: QId): Quality => QUALITIES.find((q: Quality) => q.id === id) as Quality;
export const rootName = (r: RootDef): string => spellAt(r, 0, 0);
// The chord's name from the one place that makes them (shared/notation): the quality's kind, and, for an inverted Drop 2 voicing, the
// bass note as a slash chord (G-6/E). A double-accidental bass (B\u266d\u266d) is written as its simple enharmonic (A).
export const kindOf = (q: Quality): ChordKind => q.kind ?? q.id;
export const chordName = (r: RootDef, q: Quality, inv = 0): string => chordSymbol(rootName(r), kindOf(q), inv > 0 ? simpleBass(toneNote(r, q, ORDER[inv][0])) : undefined);
export const toneNote = (r: RootDef, q: Quality, t: number): string => spellAt(r, q.ls[t], q.offs[t]);
export const toneIv = (q: Quality, t: number): string => ivAt(q.ls[t], q.offs[t]);

// Drop 2: stack the chord close (four notes within an octave), then drop the second note from the top by an octave.
// The four voicings are named by their lowest note. Each list is the chord tone (0 root, 1 third, 2 fifth, 3 seventh) of the voice from the bass up.
export const ORDER: number[][] = [[0, 2, 3, 1], [1, 3, 0, 2], [2, 0, 1, 3], [3, 1, 2, 0]];
// Drop 3 drops the THIRD note from the top of the close chord, so the bass is followed by a silent string. Bass-up chord tones per inversion:
// root R 7 3 5, 1st 3 R 5 7, 2nd 5 3 7 R, 3rd 7 5 R 3.
export const ORDER3: number[][] = [[0, 3, 1, 2], [1, 0, 2, 3], [2, 1, 3, 0], [3, 2, 0, 1]];

// What differs between the drops: which notes are voiced in what order, which string sets exist, and on which strings the voices sit in each
// picture (close chord / the dropped note has landed / the finished chord). `stepVoice` is the voice that steps across to the free string.
export interface DropType {
  id: "drop2" | "drop3";
  order: number[][];
  sets: number[];
  final: (set: number) => number[];
  closed: (set: number) => number[];
  skip: (set: number) => number[];
  stepVoice: number;
  // How many notes from the top of the close chord the dropped one is (2 or 3), and what the learner reads.
  fromTop: number;
}
export const DROP2: DropType = {
  id: "drop2", order: ORDER, sets: [0, 1, 2], stepVoice: 3, fromTop: 2,
  final: (s: number) => [s, s + 1, s + 2, s + 3], closed: (s: number) => [s + 3, s + 1, s + 2, s + 4], skip: (s: number) => [s, s + 1, s + 2, s + 4],
};
export const DROP3: DropType = {
  id: "drop3", order: ORDER3, sets: [0, 1], stepVoice: 1, fromTop: 3,
  final: (s: number) => [s, s + 2, s + 3, s + 4], closed: (s: number) => [s + 2, s + 1, s + 3, s + 4], skip: (s: number) => [s, s + 1, s + 3, s + 4],
};
export const INV_NAMES = ["Root position", "1st inversion", "2nd inversion", "3rd inversion"];
// The close-position chord each voicing comes from, low to high: the dropped note is the second from the top.
export const CLOSE: number[][] = [[2, 3, 0, 1], [3, 0, 1, 2], [0, 1, 2, 3], [1, 2, 3, 0]];
// The four string sets: the lowest string of four neighbours (0 = low E).
export const SETS = [0, 1, 2];
// How the lesson says which four neighbouring strings: by the string the lowest note is on (the chord uses it and the three above).
export const BASS_LABELS = ["Bass on String 6", "Bass on String 5", "Bass on String 4"];

const REF = QUALITIES[0].offs;
export interface Placed { frets: number[]; pitches: number[]; strings: number[] }
// A Drop 2 chord placed on four neighbouring strings. `ref` is its pitches as a major 7th; every other quality moves single notes
// from those (a tone one semitone lower is one fret lower), which keeps the unchanged notes exactly where they are.
export interface Inst { ref: number[]; set: number; inv: number; dt: DropType }
export function place(inst: Inst, q: Quality): Placed {
  const order = inst.dt.order[inst.inv];
  const pitches = inst.ref.map((p: number, j: number) => p + q.offs[order[j]] - REF[order[j]]);
  const strings = inst.dt.final(inst.set);
  return { pitches, strings, frets: pitches.map((p: number, j: number) => p - OPEN_MIDI[strings[j]]) };
}
function valid(inst: Inst): boolean {
  return QUALITIES.every((q: Quality) => {
    const pl = place(inst, q);
    const lo = Math.min(...pl.frets);
    const hi = Math.max(...pl.frets);
    return lo >= 0 && hi <= MAXF && hi - lo <= 5 && pl.pitches.every((p: number, j: number) => j === 0 || p > pl.pitches[j - 1]);
  });
}
// Every place on the neck where this Drop 2 chord (this inversion, on this string set) fits, from the nut up.
export function instances(root: RootDef, set: number, inv: number, dt: DropType = DROP2): Inst[] {
  const order = dt.order[inv];
  const out: Inst[] = [];
  for (let f0 = 0; f0 <= MAXF; f0++) {
    const p0 = OPEN_MIDI[set] + f0;
    if (p0 % 12 !== (root.pc + REF[order[0]]) % 12) continue;
    const ref = [p0];
    for (let j = 1; j < 4; j++) {
      let p = ref[j - 1] + 1;
      while (p % 12 !== (root.pc + REF[order[j]]) % 12) p++;
      ref.push(p);
    }
    const inst: Inst = { ref, set, inv, dt };
    if (valid(inst)) out.push(inst);
  }
  return out;
}
// Where the lesson starts: the lowest copy that never needs an open string in any of the seven chords.
export function home(list: Inst[]): number {
  const i = list.findIndex((x: Inst) => QUALITIES.every((q: Quality) => Math.min(...place(x, q).frets) >= 1));
  return i >= 0 ? i : 0;
}
export const rootStringFret = (inst: Inst, q: Quality): number => place(inst, q).frets[inst.dt.order[inst.inv].indexOf(0)];

// The three pictures of "closed, then drop". Each lists the four voices by chord tone (0 root, 1 third, 2 fifth, 3 seventh or sixth).
//  closed: the chord stacked close (four notes within an octave) on four neighbouring strings, one string above the Drop 2 set.
//  skip:   the second note from the top has dropped an octave to the bass string; the string it left is silent. Nothing else moved.
//  drop:   the top note has stepped across to the silent string (same pitch), so all four strings are neighbours: the Drop 2 chord.
export type View = "closed" | "skip" | "drop";
export interface VV { s: number; f: number; tone: number; pitch: number }
export function viewVoices(inst: Inst, q: Quality, view: View): VV[] | null {
  const dt = inst.dt;
  const order = dt.order[inst.inv];
  const P = place(inst, q).pitches;
  const strs = view === "closed" ? dt.closed(inst.set) : view === "skip" ? dt.skip(inst.set) : dt.final(inst.set);
  if (strs.some((x: number) => x > 5)) return null;
  const out = P.map((p: number, j: number) => { const pitch = view === "closed" && j === 0 ? p + 12 : p; return { tone: order[j], s: strs[j], pitch, f: pitch - OPEN_MIDI[strs[j]] }; });
  if (out.some((v: VV) => v.f < 0 || v.f > MAXF)) return null;
  return out.sort((a: VV, b: VV) => a.tone - b.tone);
}
// The fret window (first fret shown) that holds the chord in these qualities and views, with one fret of room below, so the board does
// not slide while one note changes. null when the views do not fit in seven frets.
export function windowFor(inst: Inst, qs: Quality[], views: View[]): number | null {
  const all: number[] = [];
  for (const q of qs) for (const v of views) { const vv = viewVoices(inst, q, v); if (!vv) return null; vv.forEach((x: VV) => all.push(x.f)); }
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  if (hi - lo > 6) return null;
  let wl = Math.max(0, lo - 1);
  if (hi > wl + 6) wl = hi - 6;
  return Math.max(0, Math.min(wl, MAXF - 6));
}
// Where a step starts: the lowest copy of the chord whose views all fit, preferring one that needs no open string.
export function homeFor(list: Inst[], qs: Quality[], views: View[]): number {
  const ok = (x: Inst): boolean => windowFor(x, qs, views) !== null;
  const noOpen = (x: Inst): boolean => qs.every((q: Quality) => views.every((v: View) => Math.min(...(viewVoices(x, q, v) ?? [{ f: -1 }]).map((y: { f: number }) => y.f)) >= 1));
  let i = list.findIndex((x: Inst) => ok(x) && noOpen(x));
  if (i < 0) i = list.findIndex(ok);
  return i >= 0 ? i : 0;
}

// ii - V - I in a key, all on one string set: the three voicings whose notes move the least between chords.
export interface ProgChord { root: RootDef; q: Quality; inst: Inst }
export function progression(k: RootDef, set: number, dt: DropType = DROP2): ProgChord[] {
  const chords = [
    { root: { pc: (k.pc + 2) % 12, letter: (k.letter + 1) % 7 }, q: Q("m7") },
    { root: { pc: (k.pc + 7) % 12, letter: (k.letter + 4) % 7 }, q: Q("dom7") },
    { root: k, q: Q("maj7") },
  ];
  const cands = chords.map((c: { root: RootDef; q: Quality }) => {
    const out: ProgChord[] = [];
    for (let inv = 0; inv < 4; inv++) instances(c.root, set, inv, dt).forEach((inst: Inst) => { const lo = Math.min(...place(inst, c.q).frets); if (lo >= 1 && lo <= 12) out.push({ ...c, inst }); });
    return out;
  });
  const dist = (a: ProgChord, b: ProgChord): number => { const x = place(a.inst, a.q).pitches; const y = place(b.inst, b.q).pitches; return [...x].sort((m: number, n: number) => m - n).reduce((s: number, p: number, i: number) => s + Math.abs(p - [...y].sort((m: number, n: number) => m - n)[i]), 0); };
  let best: ProgChord[] = [];
  let bestScore = Infinity;
  for (const a of cands[0]) for (const b of cands[1]) for (const c of cands[2]) {
    const s = dist(a, b) + dist(b, c) + Math.min(...place(a.inst, a.q).frets) * 0.001;
    if (s < bestScore) { bestScore = s; best = [a, b, c]; }
  }
  return best;
}

// The ii V i walk: one string set, four rounds. Round r starts on the ii chord in inversion r (root position, 1st, 2nd, 3rd), each a little
// higher up the neck than the one before; the V and the i are then the voicings closest to the chord before them (on the same strings, the
// smallest total fret movement, so the fewest and shortest finger moves). Minor: \u00f8 - 7 - minor 6. Major: m7 - 7 - maj7.
export const fretDistance = (a: ProgChord, b: ProgChord): number => {
  const x = place(a.inst, a.q).frets;
  const y = place(b.inst, b.q).frets;
  return x.reduce((s: number, f: number, j: number) => s + Math.abs(f - y[j]), 0);
};
export function walkChords(k: RootDef, minor: boolean, set: number, dt: DropType = DROP2): ProgChord[][] {
  const base = [
    { root: { pc: (k.pc + 2) % 12, letter: (k.letter + 1) % 7 }, q: minor ? Q("hdim") : Q("m7") },
    { root: { pc: (k.pc + 7) % 12, letter: (k.letter + 4) % 7 }, q: Q("dom7") },
    { root: k, q: minor ? Q("m6") : Q("maj7") },
  ];
  const all = (c: { root: RootDef; q: Quality }): ProgChord[] => {
    const out: ProgChord[] = [];
    for (let inv = 0; inv < 4; inv++) instances(c.root, set, inv, dt).forEach((inst: Inst) => out.push({ ...c, inst }));
    const noOpen = out.filter((x: ProgChord) => Math.min(...place(x.inst, x.q).frets) >= 1);
    return noOpen.length ? noOpen : out;
  };
  const nearest = (prev: ProgChord, c: { root: RootDef; q: Quality }): ProgChord => all(c).reduce((best: ProgChord | null, x: ProgChord) => (best === null || fretDistance(prev, x) < fretDistance(prev, best) ? x : best), null) as ProgChord;
  const rounds: ProgChord[][] = [];
  let lastBass = -1;
  for (let r = 0; r < 4; r++) {
    let list = instances(base[0].root, set, r, dt).filter((x: Inst) => Math.min(...place(x, base[0].q).frets) >= 1);
    if (!list.length) list = instances(base[0].root, set, r, dt);
    const inst = list.find((x: Inst) => place(x, base[0].q).pitches[0] > lastBass) ?? list[list.length - 1];
    lastBass = place(inst, base[0].q).pitches[0];
    const ii: ProgChord = { ...base[0], inst };
    const v = nearest(ii, base[1]);
    rounds.push([ii, v, nearest(v, base[2])]);
  }
  return rounds;
}
