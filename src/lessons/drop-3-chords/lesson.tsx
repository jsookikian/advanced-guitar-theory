import { makeDropLesson } from "../../shared/drop/DropLesson";
import type { DropConfig } from "../../shared/drop/DropLesson";
import { DROP2, DROP3, BASS_LABELS } from "../../shared/drop/theory";

// Drop 3: the THIRD note from the top of a close seventh chord drops an octave to become the bass, and one string stays silent between the bass and
// the other three notes. Same engine as Drop 2 (src/shared/drop/); this folder holds its configuration and its own wording.
const config: DropConfig = {
  dt: DROP3,
  other: DROP2,
  title: "Drop 3 Chords",
  tutKey: "agt-drop-3-chords-tutorial-seen",
  credit: { href: "https://www.jazzguitar.be/blog/drop-3-chords-and-inversions/", label: "Drop 3 chords and inversions on jazzguitar.be" },
  // The opening picture: the 1st-inversion chord with the bass on string 5 (the 3 in the bass), straight from a close chord on the top four strings.
  openSet: 1,
  openInv: 1,
  texts: ({ I, maj, cs, ip, seq, B, sameInv, toneIvs }) => ({
    opening: [
      { text: <>Start with <B>{cs(I, "maj7")}</B> stacked as a closed chord on the top four strings: {seq(toneIvs(maj, [0, 1, 2, 3]))}, all within one octave.</>, sub: "closed position" },
      { text: <>Drop the third note from the top, the {ip("3")}, down an octave. It lands on string 5 and becomes the bass.</>, sub: "the third drops" },
      { text: <>{ip("R")} now has a silent string beside it. Step it across to string 3: same sound, new string.</>, sub: "one more step" },
      { text: <>The bass, one silent string, then three neighbours: {sameInv(1, maj)} from the bass up. That is a Drop 3 chord.</>, sub: "Drop 3 · 1st inversion" },
    ],
    compare: [
      { text: <>Drop 2 drops the second note from the top, so all four notes sit on neighbouring strings. Here <B>{cs(I, "maj7")}</B> with the third in the bass.</>, sub: "Drop 2 · 1st inversion" },
      { text: <>Drop 3 drops the third note instead. The bass leaps further below the rest, so one string stays silent after it.</>, sub: "Drop 3 · 1st inversion" },
    ],
    strings: [
      { text: <>Bass on string 6: the chord uses strings 4, 3 and 2 above it. String 5 stays silent.</>, sub: BASS_LABELS[0] },
      { text: <>Bass on string 5: the chord uses strings 3, 2 and 1 above it. String 4 stays silent. Lighter and brighter.</>, sub: BASS_LABELS[1] },
    ],
  }),
};
export default makeDropLesson(config);
