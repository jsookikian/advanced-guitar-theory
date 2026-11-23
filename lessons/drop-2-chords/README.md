# Drop 2 Chords

The second lesson of the Advanced Guitar Theory site. Source: `src/lessons/drop-2-chords/` (`lesson.tsx`, `theory.ts`, `Board.tsx`, `main.tsx`); built page `lessons/drop-2-chords/index.html` + `app.js` (committed). All lesson text and diagrams are our own; the topic list was informed by jazzguitar.be's page on the subject, which the lesson credits once as "Further reading".

## Steps

| # | Chip | Beats | Teaches |
|---|---|---|---|
| 1 | Drop 2 | 4 | Close chord on the top four strings (Cmaj7: D 10, G 9, B 8, e 7), the 5 drops an octave to the A string, the 7 steps from e to B, the finished Drop 2 chord |
| 2 | Strings | 3 | Bass on string 6, 5 or 4 |
| 3 | Inversions | 4 | Root, 1st, 2nd, 3rd inversion (named by the lowest note) |
| 4 | Qualities | 9 | 7, m7 and half-diminished, each closed, then dropped, then stepped across |
| 5 | Dim to 6 | 6 | dim7, raise the 5th, the enharmonic respelling of the top note (double-flat 7 becomes 6), raise the 3rd, C6 = Am7 |
| 6 | ii V i | 12 | Four rounds up the neck (ii in root position, 1st, 2nd, 3rd inversion), V and i voiced closest to the chord before; Minor or Major, bass string picked automatically (lowest range) or by the player; Play the round |
| 7 | Explore | 1 | Seven chord qualities, three bass strings, four inversions, arrows to the next place on the neck |

## Theory (`theory.ts`)

- A Drop 2 chord: stack the chord close, drop the second note from the top by an octave. Inversions are named by the lowest note.
- Placement is computed from the key, never transcribed: `instances()` lists every place a chord (inversion, string set) fits on frets 0-24 with a span of at most 5 frets in every quality; `place()` moves single notes by quality (a note one semitone lower is one fret lower), so a quality change never moves a note that does not change.
- `viewVoices()` gives the three pictures of "close, then drop": closed (one string above the Drop 2 set), skip (the 5th has dropped, one string silent), drop (the top note has stepped across).
- Spelling: `spellAt()` takes the letter from the interval number and the accidental from the pitch, so double flats appear where they belong (Bbb in Cdim7).
- Slash chords: `chordName(root, quality, inversion)`; a double-accidental bass is written as its simple enharmonic (C dim7 over A, not over Bbb).
- Chord symbols come from `src/shared/notation.tsx` (`chordSymbol`, style "symbols" by default: triangle, minus, circle, half-diminished from MuseJazz Text; "letters" style exists behind one constant).

## Tests (from `tests/`)

`drop2-theory.js` (all 12 keys, node only), `fonts.js`, `drop2.js` (browser), `drop2-shots.js` and `drop2-tabs.js` / `drop2-respell.js` (screenshots into `renders/drop2/`).
