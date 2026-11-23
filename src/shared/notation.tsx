import type { ReactNode } from "grok/canvas";

// Shared by the lessons: the twelve keys, note spelling, and chord names set like a lead sheet (MuseJazz Text).
export interface KeyDef { id: string; pc: number; letter: number }
export const KEYS: KeyDef[] = [
  { id: "C", pc: 0, letter: 0 }, { id: "Db", pc: 1, letter: 1 }, { id: "D", pc: 2, letter: 1 },
  { id: "Eb", pc: 3, letter: 2 }, { id: "E", pc: 4, letter: 2 }, { id: "F", pc: 5, letter: 3 },
  { id: "F#", pc: 6, letter: 3 }, { id: "G", pc: 7, letter: 4 }, { id: "Ab", pc: 8, letter: 5 },
  { id: "A", pc: 9, letter: 5 }, { id: "Bb", pc: 10, letter: 6 }, { id: "B", pc: 11, letter: 6 },
];
export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
export const NATURAL = [0, 2, 4, 5, 7, 9, 11];

// Accidentals are the real symbols (♭ ♯), never a letter b or a #. `flat` converts a key id such as "Bb" or "F#" for display.
export const flat = (id: string): string => id.replace(/(?<=[A-G])b/g, "♭").replace(/#/g, "♯");

// ---- Chord names: one place ------------------------------------------------------------------------------------------------
// Every chord name on the site is made here, from a root, a kind and an optional bass note, so the notation can change in one place.
//  "symbols" (default): C+U+E18A 7 (MuseJazz Text's own triangle for major 7), C-7 and C-6 (its hyphen as the minus for minor), C+U+E18F (its half-diminished
//                       glyph), C+U+E187 7 (its circle for diminished 7). These four are Private Use codepoints drawn by the MuseJazz Text font, so they
//                       only show where that font is loaded (spokenName gives the plain-text version for filenames and screen readers);
//                       plain C7, C9, C6 for dominant and major 6.
//  "letters":           Cmaj7, Cm7, Cm6, Cm7\u266d5, Cdim7.
// NOTATION is the single value the rest of the code reads; a future setting only has to change it (and persist it).
export type NotationStyle = "symbols" | "letters";
export const NOTATION: { style: NotationStyle } = { style: "symbols" };
export type ChordKind = "maj7" | "dom7" | "m7" | "hdim" | "dim7" | "m6" | "six" | "dom9" | "min";
const KIND: Record<ChordKind, { symbols: string; letters: string }> = {
  maj7: { symbols: "\uE18A7", letters: "maj7" },
  dom7: { symbols: "7", letters: "7" },
  m7: { symbols: "-7", letters: "m7" },
  hdim: { symbols: "\uE18F7", letters: "m7\u266d5" },
  dim7: { symbols: "\uE1877", letters: "dim7" },
  m6: { symbols: "-6", letters: "m6" },
  six: { symbols: "6", letters: "6" },
  dom9: { symbols: "9", letters: "9" },
  min: { symbols: "-", letters: "m" },
};
// "C\uE18A7", "G-6/E": the root (already spelled with \u266d \u266f), the kind's suffix, and "/bass" when there is a bass note other than the root.
export function chordSymbol(root: string, kind: ChordKind, bass?: string, style: NotationStyle = NOTATION.style): string {
  return `${root}${KIND[kind][style]}${bass ? `/${bass}` : ""}`;
}
// A name safe for a file name: ASCII only.
export function asciiName(name: string): string {
  return name.replace(/\uE18A/g, "maj").replace(/\uE187/g, "dim").replace(/\uE18F/g, "o").replace(/\u00f8/g, "o").replace(/\u266f/g, "sharp").replace(/\u266d/g, "b").replace(/-/g, "m").replace(/\//g, "over").toLowerCase().replace(/[^a-z0-9]/g, "");
}
// The same name in plain letters, for aria-labels (screen readers cannot read the font's private glyphs): "C\uE18A7" is "Cmaj7".
export function spokenName(name: string): string {
  return name.replace(/\uE18A/g, "maj").replace(/\uE187/g, "dim").replace(/\uE18F7?/g, "m7\u266d5").replace(/(?<=[A-G\u266d\u266f])-(?=\d)/g, "m").replace(/\//g, " over ");
}
// A bass note with a double accidental (B\u266d\u266d) is written as its simple enharmonic (A) when it is the bass of a slash chord.
export function simpleBass(note: string): string {
  if (note.length < 3) return note;
  const pc = (NATURAL[LETTERS.indexOf(note[0])] + (note[1] === "\u266d" ? -note.length + 1 : note.length - 1) + 120) % 12;
  return (note[1] === "\u266f" ? ["C", "C\u266f", "D", "D\u266f", "E", "F", "F\u266f", "G", "G\u266f", "A", "A\u266f", "B"] : ["C", "D\u266d", "D", "E\u266d", "E", "F", "G\u266d", "G", "A\u266d", "A", "B\u266d", "B"])[pc];
}

// A chord name is set like a lead sheet: the root letter stays on the line, and everything that follows it (the quality and extension: -6,
// \u25b37, \u00b07, \u00f8, 9, 7, maj7, dim7, m6) is raised and smaller, as are flats and sharps. `titlePieces` cuts a name into those parts; the screen
// and the share image both draw from it. Words after the chord ("Rootless", "Dominant Pentatonic") and a slash bass note stay on the line.
export interface TitlePiece { t: string; scale: number; rise: number; after?: number }
const QUALITY = "maj\\d*|dim\\d*|m\\d*|\u00f8\\d*|\uE18F\\d*|[\uE18A\uE187]\\d+|-\\d*|\\d+";
export function titlePieces(text: string): TitlePiece[] {
  // Two readings of the same notes, "C-6 = A\u00f87": each side is set as its own chord name.
  if (text.includes(" = ")) return text.split(" = ").flatMap((seg: string, i: number) => (i ? [{ t: " = ", scale: 1, rise: 0 }, ...titlePieces(seg)] : titlePieces(seg)));
  const acc = (t: string): TitlePiece => ({ t, scale: 0.92, rise: 0.5 });
  // A slash chord gets a little extra air after the "/" (G-6/ E).
  const rest = (t: string): TitlePiece[] => t.split(/([\u266d\u266f]|\/)/).filter((x: string) => x !== "").map((x: string) => (x === "\u266d" || x === "\u266f" ? acc(x) : x === "/" ? { t: x, scale: 1, rise: 0, after: 0.34 } : { t: x, scale: 1, rise: 0 }));
  const m = new RegExp(`^([A-G])([\u266d\u266f]{0,2})(${QUALITY})?(.*)$`).exec(text);
  if (!m || (!m[2] && !m[3])) return rest(text); // no accidental, quality or number after the letter: not a chord to set in pieces ("Arpeggio", "Drop 2", "C Mixolydian")
  const out: TitlePiece[] = [{ t: m[1], scale: 1, rise: 0 }];
  if (m[2]) out.push(acc(m[2]));
  if (m[3]) out.push({ t: m[3], scale: 0.84, rise: 0.38 });
  return [...out, ...rest(m[4])];
}
// Chord names inside running text (E-7, C9, G\u00f8) get the same lead-sheet treatment; `chordify` finds them in a string.
const CHORD_IN_TEXT = new RegExp(`([A-G][\u266d\u266f]{0,2}(?:maj\\d*|dim\\d*|m\\d*|\u00f8\\d*|\uE18F\\d*|[\uE18A\uE187-]\\d+|\\d+)(?:/[A-G][\u266d\u266f]{0,2})?(?![\\w\u266d\u266f]))`);
export function chordify(text: string): ReactNode {
  return text.split(CHORD_IN_TEXT).map((part: string, i: number) => (i % 2 === 1 ? <span key={i} style={{ whiteSpace: "nowrap" }}>{titleNodes(part)}</span> : part));
}
// Children of a chord-name component: when they are all text, join them and set the name; otherwise leave them as they are.
export function chordChildren(children: ReactNode): ReactNode {
  const arr = Array.isArray(children) ? children : [children];
  return arr.every((x: unknown) => typeof x === "string" || typeof x === "number") ? titleNodes(arr.join("")) : children;
}
// The chord-symbol glyphs are Private Use codepoints that only MuseJazz Text draws, and the minus is that font's own hyphen: every quality
// piece (the raised part of a name) sets MuseJazz Text itself, whatever the surrounding text is. Never bold: the font has one weight.
export const MUSE_FONT = "'MuseJazz Text'";
export function titleNodes(text: string, scale = 1.1): ReactNode {
  if (text.includes(" = ")) return text.split(" = ").map((seg: string, i: number) => <span key={i}>{i ? " = " : ""}{titleNodes(seg, scale)}</span>);
  const pieces = titlePieces(text);
  // A chord name is set as a whole in MuseJazz Text (root letter, accidentals, quality, slash bass); other text (a title like "C Mixolydian")
  // keeps the page font. `scale` evens out MuseJazz's size against the surrounding text (1 where the name is already in MuseJazz, the big title).
  const chord = pieces.some((x: TitlePiece) => x.scale !== 1 || x.rise !== 0 || x.after !== undefined);
  const inner = pieces.map((x: TitlePiece, i: number) => (x.scale === 1 && !x.after
    ? x.t
    : <span key={i} data-sup="1" data-muse={x.scale === 0.84 ? "1" : undefined} style={{ fontSize: `${x.scale}em`, position: "relative", top: `-${x.rise}em`, margin: x.after ? `0 ${x.after}em 0 0.02em` : "0 0.02em 0 0.03em", whiteSpace: "nowrap" }}>{x.t}</span>));
  return chord ? <span data-chord="1" style={{ fontFamily: MUSE_FONT, fontWeight: 400, fontSize: scale === 1 ? undefined : `${scale}em`, whiteSpace: "nowrap" }}>{inner}</span> : inner;
}
