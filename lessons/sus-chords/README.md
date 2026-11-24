# Sus Chords in A Dorian

The third lesson of the Advanced Guitar Theory site. Source: `src/lessons/sus-chords/` (`lesson.tsx`, `theory.ts`, `main.tsx`); built page `lessons/sus-chords/index.html` + `app.js` (committed). It sits on the shared Drop 2 engine (`src/shared/drop/theory.ts`, `Board.tsx`) and reuses `ui`, `notation`, `pip`, `Tutorial`, `share` and `audio`. All text and diagrams are our own.

## What it teaches

Every chord is a **Drop 2 voicing of a 7sus4** (R 4 5 ♭7). The lesson does not teach how to build a Drop 2 chord (the Drop 2 lesson does); it starts from the voicings:

- A Drop 2 **dominant 7** becomes a **7sus4** when its 3rd steps up one fret to the 4th (D7 to D7sus4: F♯ to G). Nothing else moves.
- That is shown for all four inversions on the top four strings first, then the same move on the middle and the low string sets.
- D7sus4 and A7sus4 are a pair a fifth apart: G and A stay put while C goes up to D and D goes up to E (two whole steps).
- In A Dorian a 7sus4 works on A, B, D and E (not C, F♯ or G). Over Am7 swap the ♭3 for the 4 (A7sus4); over D7 swap the 3 for the 4 (D7sus4) and let the G fall back to F♯.

## Where the ideas come from, and what is ours

The lesson started from Jordan's video "How to use Sus chords in your everyday playing" (https://youtu.be/AQ_mUG8oCNQ), credited once as "Further reading". The video's captions were summarised by another tool, so everything was re-checked independently (see `CONTEXT.md`). The video's own fingerings were not seen: every grip here is computed by `theory.ts`, and the Drop 2 7sus4 framing is Jordan's own direction.

## Steps

| # | Chip | Beats | Teaches |
|---|---|---|---|
| 1 | Make it | 8 | D7 then D7sus4 in each inversion on the top four strings, climbing the neck: 1st (F♯ in the bass), 2nd, 3rd, root position. The moved dot rings with a dashed ghost on the F♯ |
| 2 | Strings | 4 | The same move in root position on the middle (bass on string 5) and low (bass on string 6) string sets |
| 3 | Pair | 3 | D7sus4/G and A7sus4/G: two dots move a whole step, G and A stay |
| 4 | Walk | 2 per position | Every position of the pair on a chosen string set, D7sus4 then A7sus4; "Play the position" strums both |
| 5 | Vamp | 6 | Am7 to A7sus4, D7 to D7sus4, the G falling to F♯, and the A7sus4 re-read from the key root (Am7 with an added 11 and no 5th) |
| 6 | Explore | 1 | String set tabs, chord pair tabs (D7sus4 / A7sus4 and two more fifths in A Dorian), a chord tab, arrows up and down the neck, Names / Intervals |

Settings: Key (all 12), Left-handed, Sound, Drone (the key's root, the natural pedal for the Vamp), Show tutorial, Share image.

## Theory (`theory.ts`)

- `SUS7` is a quality whose chord tone 1 is the 4th: the engine's Drop 2 placement is reused, with the 3rd raised and the 7th lowered a fret from its major 7 reference.
- `dropInsts(k, rel, set)` lists every Drop 2 voicing of a 7sus4 on a string set (four fretted notes, at most 4 frets across); `makeInst` picks the lowest one in an inversion that also fits as a dominant 7.
- `pairPositions(k, pair, set)` pairs each voicing of the first chord with the nearest voicing of the second, kept when it is the two-voice whole-step move. `PAIRS` are the three fifths that work in A Dorian.
- Names come only from `chordSymbol` / `susName` (a 7sus4 slashed over its lowest note unless that is the root).

## Tests (from `tests/`, with `CHROME` set)

- `walk.js` (node): every grip in all 12 keys is a real Drop 2 of its chord and inversion; D7 to D7sus4 moves exactly one note up a fret; A Dorian equals the expected frets.
- `sus.js` (browser): circles, constant page height and board position, the right dots move on Make, Strings, Pair, Vamp and Walk, every key, every Explore combination, overflow at 320 / 360 / 390.
- `sus-shots.js`: screenshots into `renders/sus/` (set `W=320` for another width, `ONLY=s1b2,s5b2` for some).
