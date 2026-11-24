import { makeDropLesson } from "../../shared/drop/DropLesson";
import type { DropConfig } from "../../shared/drop/DropLesson";
import { DROP2, BASS_LABELS } from "../../shared/drop/theory";

// Drop 2: the second note from the top of a close seventh chord drops an octave; the four notes sit on four neighbouring strings.
// The engine, the shared steps (qualities, learn and practise, the ii V i walk, Explore) and the board live in src/shared/drop/.
// This folder holds what is Drop 2's own: the configuration and the wording of the opening and the string sets.
const config: DropConfig = {
  dt: DROP2,
  title: "Drop 2 Chords",
  tutKey: "agt-drop-2-chords-tutorial-seen",
  credit: { href: "https://www.jazzguitar.be/blog/drop-2-chords/", label: "Drop 2 chords on jazzguitar.be" },
  // The opening picture: the 2nd-inversion chord on strings 5 to 2 (the 5 in the bass), straight from a close chord on the top four strings.
  openSet: 1,
  openInv: 2,
  texts: ({ I, maj, cs, ip, seq, B, sameInv, toneIvs }) => ({
    opening: [
      { text: <>Start with <B>{cs(I, "maj7")}</B> stacked as a closed chord on the top four strings: {seq(toneIvs(maj, [0, 1, 2, 3]))}, all within one octave.</>, sub: "closed position" },
      { text: <>Drop the second note from the top, the {ip("5")}, down an octave. It lands on string 5 and becomes the bass.</>, sub: "the fifth drops" },
      { text: <>The {ip("7")} now has a silent string beside it. Step it across to string 2: same sound, new string.</>, sub: "one more step" },
      { text: <>Four notes on four neighbouring strings, {sameInv(2, maj)} from the bass up. That is a Drop 2 chord.</>, sub: "Drop 2 · 2nd inversion" },
    ],
    strings: [
      { text: <>Bass on string 6 is the lowest set, and the fullest sound.</>, sub: BASS_LABELS[0] },
      { text: <>Bass on string 5 is the next set up. Same chord, same order of notes, a lighter sound.</>, sub: BASS_LABELS[1] },
      { text: <>Bass on string 4 is the highest set: bright and compact, good for comping above a bass.</>, sub: BASS_LABELS[2] },
    ],
  }),
};
export default makeDropLesson(config);
