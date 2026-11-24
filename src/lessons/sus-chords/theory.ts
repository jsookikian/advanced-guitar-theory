import { OPEN_MIDI, MAXF, DROP2, Q, place, toneNote, toneIv, spellAt } from "../../shared/drop/theory";
import type { Quality, Inst, RootDef, QId } from "../../shared/drop/theory";
import { chordSymbol, simpleBass } from "../../shared/notation";

// Pure music theory for the Drop 2 7sus4 lesson (no React). A 7sus4 chord is 1 4 5 ♭7. The shared Drop engine places and names Drop 2 chords
// by chord tone (0 root, 1 third, 2 fifth, 3 seventh); here tone 1 is the 4th, so a 7sus4 is the engine's chord with its 3rd raised a fret
// and its 7th lowered a fret. Everything is computed from the key: in A Dorian a 7sus4 works on A, B, D and E (not on C, F♯ or G).
export const SUS7: Quality = { id: "sus7" as unknown as QId, offs: [0, 5, 7, 10], ls: [0, 3, 4, 6], kind: "dom7sus4" };
const REF = [0, 4, 7, 11]; // the engine's reference chord (a major 7th)
export const SPAN = 4; // frets between the lowest and highest fret of one grip
export const TOP_A = 17; // the highest fret searched in the key of A; keys above A search that many frets further

// Chord roots as semitones and letters above the key (A Dorian: A, B, D, E).
const LETTERS_ABOVE: Record<number, number> = { 0: 0, 2: 1, 5: 3, 7: 4 };
export const chordRoot = (k: RootDef, rel: number): RootDef => ({ pc: (k.pc + rel) % 12, letter: (k.letter + LETTERS_ABOVE[rel]) % 7 });
// The pairs of chords a fifth apart whose Drop 2 voicings are one whole-step move away from each other: [first, second] as semitones above the key.
export const PAIRS: [number, number][] = [[5, 0], [0, 7], [7, 2]];
export const SET_COUNT = 3; // string sets: bass on string 6, 5 or 4 (the engine's sets 0, 1, 2)

/** How many frets the key sits above A, folded to -6..+5 so the searched range stays on the neck. */
export const shiftFromA = (keyPc: number): number => ((((keyPc - 9 + 6) % 12) + 12) % 12) - 6;
export const maxFretFor = (keyPc: number): number => Math.min(MAXF, TOP_A + Math.max(0, shiftFromA(keyPc)));

export const frets = (inst: Inst, q: Quality = SUS7): number[] => place(inst, q).frets;
export const strings = (inst: Inst): number[] => place(inst, SUS7).strings;
export const pitches = (inst: Inst, q: Quality = SUS7): number[] => place(inst, q).pitches;
export const tones = (inst: Inst): number[] => inst.dt.order[inst.inv];

/**
 * Every Drop 2 voicing of the 7sus4 chord on a string set, in all four inversions (named by the lowest note), from the nut up. Each is four
 * fretted notes (no open string) on four neighbouring strings, at most SPAN frets across, within the searched range of frets.
 */
export function dropInsts(k: RootDef, rel: number, set: number): Inst[] {
  const root = chordRoot(k, rel);
  const mx = maxFretFor(k.pc);
  const strs = DROP2.final(set);
  const out: Inst[] = [];
  for (let inv = 0; inv < 4; inv++) {
    const order = DROP2.order[inv];
    const pc = (j: number): number => (root.pc + SUS7.offs[order[j]]) % 12;
    for (let f0 = 1; f0 <= mx; f0++) {
      const p0 = OPEN_MIDI[set] + f0;
      if (p0 % 12 !== pc(0)) continue;
      const pit = [p0];
      for (let j = 1; j < 4; j++) { let p = pit[j - 1] + 1; while (p % 12 !== pc(j)) p++; pit.push(p); }
      const fr = pit.map((p: number, j: number) => p - OPEN_MIDI[strs[j]]);
      if (Math.min(...fr) < 1 || Math.max(...fr) > mx || Math.max(...fr) - Math.min(...fr) > SPAN) continue;
      out.push({ ref: pit.map((p: number, j: number) => p - (SUS7.offs[order[j]] - REF[order[j]])), set, inv, dt: DROP2 });
    }
  }
  return out.sort((a: Inst, b: Inst) => Math.min(...frets(a)) - Math.min(...frets(b)) || Math.max(...frets(a)) - Math.max(...frets(b)));
}


const dist = (a: Inst, b: Inst): number => { const x = frets(a); const y = frets(b); return x.reduce((s: number, f: number, j: number) => s + Math.abs(f - y[j]), 0); };
export const MOVE = 4; // two voices, a whole step (two frets) each

export interface PairPos { a: Inst; b: Inst; lo: number; hi: number }
const cache = new Map<string, PairPos[]>();
/**
 * The positions of a pair of chords on a string set: for each voicing of the first chord, the voicing of the second chord that is nearest to it
 * (the smallest total fret movement), kept when that is the whole-step move of two voices. Listed from the nut up.
 */
export function pairPositions(k: RootDef, pair: number, set: number): PairPos[] {
  const id = `${k.pc}:${pair}:${set}`;
  const have = cache.get(id);
  if (have) return have;
  const [r1, r2] = PAIRS[pair];
  const A = dropInsts(k, r1, set);
  const B = dropInsts(k, r2, set);
  const out: PairPos[] = [];
  for (const a of A) {
    let best: Inst | null = null;
    for (const b of B) if (best === null || dist(a, b) < dist(a, best)) best = b;
    if (best === null || dist(a, best) > MOVE) continue;
    const all = [...frets(a), ...frets(best)];
    out.push({ a, b: best, lo: Math.min(...all), hi: Math.max(...all) });
  }
  out.sort((x: PairPos, y: PairPos) => x.lo - y.lo || x.hi - y.hi);
  cache.set(id, out);
  return out;
}

/**
 * Where the guided steps start: the lowest position of the first pair on the highest four strings whose chords also stay off the nut when the
 * 4th is turned back into a 3rd (A7sus4 to A-7) and the dominant 7 (D7sus4 to D7).
 */
export function leadPair(k: RootDef): PairPos {
  const list = pairPositions(k, 0, 2);
  const ok = (p: PairPos): boolean => Math.min(...frets(p.b, Q("m7"))) >= 1 && Math.min(...frets(p.a, Q("dom7"))) >= 1;
  return list.find(ok) ?? list[0];
}

/** The chord a voicing is named as: the 7sus4 on its root, slashed over its lowest note unless that is the root. */
export function susName(k: RootDef, rel: number, inv: number): string {
  const root = chordRoot(k, rel);
  const bass = toneNote(root, SUS7, DROP2.order[inv][0]);
  return chordSymbol(spellAt(root, 0, 0), "dom7sus4", inv > 0 ? simpleBass(bass) : undefined);
}
export const noteOf = (k: RootDef, rel: number, tone: number): string => toneNote(chordRoot(k, rel), SUS7, tone);
export const ivOf = (tone: number): string => toneIv(SUS7, tone);

/**
 * The lowest voicing of a chord in one inversion on a string set that also fits on the neck, fretted, as its dominant 7 (the 3rd one fret lower than
 * the 4th of the 7sus4): the "make" steps show the dominant 7 and then the 7sus4 on the same strings.
 */
export const makeInst = (k: RootDef, rel: number, set: number, inv: number): Inst | undefined =>
  dropInsts(k, rel, set).find((x: Inst) => x.inv === inv && Math.min(...frets(x, Q("dom7"))) >= 1);

/** The fret the board starts at (one fret of room below the lowest, seven frets in all) for a set of frets. */
export function windowFor(fr: number[]): number {
  const lo = Math.min(...fr);
  const hi = Math.max(...fr);
  let wl = Math.max(0, lo - 1);
  if (hi > wl + 6) wl = hi - 6;
  return Math.max(0, Math.min(wl, MAXF - 6));
}

/** The note names in the chord, from the bass up. */
export const bassUp = (k: RootDef, rel: number, inv: number): string[] => DROP2.order[inv].map((t: number) => noteOf(k, rel, t));
