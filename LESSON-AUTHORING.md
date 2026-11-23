# Writing a lesson for this site

A practical guide for a future session asked to build a new lesson. It records what lesson 2 (Drop 2 Chords) taught us. Read it with `README.md`, `lessons/dominant-pentatonics/CONTEXT.md` (design history) and `lessons/drop-2-chords/README.md`.

## 1. Starting out

- Read, in order: `README.md`, lesson 1's `README.md` and `CONTEXT.md`, then skim `src/lessons/drop-2-chords/` (smaller and cleaner than lesson 1) and `src/shared/`.
- Layout: `src/lessons/<id>/main.tsx` (mounts `App` into `#root`), `lesson.tsx`, and for pure music logic a `theory.ts` with no React, so tests can load it.
- `lessons/<id>/lesson.json` holds title, summary, level, order and the `helpful` list ("Helps to know"). `lessons/<id>/README.md` documents the lesson.
- `node build.mjs` (or `npm run build`) writes `lessons/<id>/index.html` + `app.js` and regenerates the catalog `index.html`. Commit the generated files: Forma Managed serves them as they are.
- Registering a lesson is just those files: the build discovers every `src/lessons/*/main.tsx`. Never edit the catalog by hand.
- Preview: the `guitar-theory` preview server (python http.server on :8000), or `npm run serve`. Tests start their own server.
- Check at 390px wide first (mobile first), then 320 and desktop.

## 2. Shared pieces (reuse, do not copy)

- `src/shared/notation.tsx`: `KEYS` (12 keys), `chordSymbol(root, kind, bass?, style?)` is the only place chord names are made; `NOTATION.style` is "symbols" (default) or "letters". `titlePieces` / `titleNodes` / `chordify` set names like a lead sheet; `asciiName` (file names) and `spokenName` (aria-labels) give plain versions.
- Chord symbols (symbols style): triangle for maj7, hyphen as the minus for minor (C-7, C-6), the slashed circle for half-diminished (with its 7), the small circle for dim7. They are MuseJazz Text Private Use glyphs: U+E18A (triangle), U+E18F (half-diminished), U+E187 (circle). The minus is MuseJazz Text's own hyphen U+002D.
- The font ships no SMuFL chord-symbol codepoints (U+E870-E874 are absent). Find real ones by reading the cmap, then render a grid of the PUA glyphs in a browser and look. Do not assume, and do not use U+25B3 (a generic fallback that looks thin).
- Every raised quality piece sets `font-family: 'MuseJazz Text'` itself (the page text is sans, which has no PUA glyphs: you get tofu boxes). Never bold it, the font has one weight. `tests/fonts.js` guards this.
- `src/shared/pip.tsx` + `tokens.json`: every note name and interval in running text is a circle (`pipify`, or `<Pip>`); `[x]` forces one. `tokens.json` also decides what counts as a note name: it must keep chord names (letter followed by a chord symbol, a digit-minus, or a double flat) from being read as notes.
- Avoid standalone capital A-G as ordinary words in copy ("A Drop 2...", "the A string"): the circles test reads them as notes. Say "Every...", "string 5".
- `src/shared/ui.tsx`: palette, `Tabs` (quiet underlined tabs), `lockPaint` (keeps the sheet light under forced dark modes).
- `src/shared/Tutorial.tsx`: coach-mark tour; give it steps with a selector, optional `at: [step, beat]`, `live`, `settings`.
- `src/shared/share.ts`: `shareBoard({svg, title, subtitle, fileName})` draws the PNG: bold chord name, subtitle line, diagram. File names are ASCII-safe.
- `src/shared/audio.ts`: `pluck` (tap a dot), `playPhrase` (strum or arpeggio), `stopAll`. Samples live in `/sounds`.
- `src/shared/site-root.ts`: `SITE_ROOT` for every path (fonts, links, sounds). Pages work at a domain root and under a GitHub Pages subpath.
- The Board of lesson 2 (`Board.tsx`) is a smaller copy of lesson 1's geometry (7-fret window, string names, nut). Dots are keyed by voice, so a changed note slides and the others do not move.

## 3. Design rules Jordan enforces (and why)

- Quiet and uncluttered: no boxed pills or legends, text tabs, small controls. Busy screens get called cluttered. If in doubt, leave it out.
- Constant page height between steps and beats: every step has the same rows (caption, button, label pill) even if some are empty. Test it.
- The root is always a red dot (R). A rootless chord shows the missing root as a dashed red ring, never played.
- Every note and interval in text is a circle. Roots are red; other dots are ink. In Explore the Drop 2 dots are ink, not teal.
- Chord names: MuseJazz lettering, real flats and sharps, symbols not letters. An inverted voicing is a slash chord with the extra space after the slash: C(triangle)7 / G. Root position shows no slash. A double-accidental bass is written as its simple enharmonic.
- String sets are named by the bass: "Bass on String 6/5/4", everywhere (tabs, subtitles, share image, tutorial). Never "6-5-4-3".
- Share: the native share sheet gets only the file (no `title`); the PNG itself has the chord name and the subtitle line.
- Explore at the end: chord tabs, a small Names / Intervals pill, arrows to walk the neck.
- Guided beats: one short sentence each, one change per beat, unchanged dots stay put, changed dots get a ring and a dashed ghost where they were.
- Two names for one dot (enharmonic) are shown on the board as a small "also ..." label beside the dot, off the string line, with a page-colour halo.
- Quiet voice, our own words. A "Show tutorial" link on every step; the tour opens once on a first visit (never under automation).

## 4. Teaching approach that worked

- Start from the picture people already know (the close chord), then do one thing to it (drop the second note from the top). Close, drop, step across: three beats, one dot each.
- Change one note at a time to move between chords (maj7 to 7 to m7 to half-diminished; dim7 to m6 to 6). The learner sees which note defines the chord.
- Compute every voicing from theory in all 12 keys: `instances()` lists placements, `place()` shifts single notes by quality, `viewVoices()` gives the pictures. Pick the home placement by rule (lowest with no open string), never by hand.
- Use external pages only as a topic checklist. Write all text yourself, draw your own diagrams, credit once as "Further reading".
- The ii V i walk picks the V and i voicings with the smallest total fret movement on the same strings, and starts on the string set with the lowest range for the key.

## 5. Music-theory pitfalls

- Spell by interval: the letter comes from the interval number, the accidental from the pitch (`spellAt`). Double flats are correct (Bbb in Cdim7, Abb in Db dim7); never respell silently in the diagram.
- The respelling beat (bb7 becomes 6) keeps the same fret; only the label changes. Name it "enharmonic" in plain words.
- dim7 is symmetric: any of its notes can be the bass, so slash names for dim7 are a convention. We keep the chord's own spelling except double accidentals, which become the simple enharmonic (C dim7 over A).
- A Drop 2 inversion is named by its lowest note, so root position is R 5 7 3 (the 2nd-inversion close chord with the root dropped).
- Keys near the nut: require every quality's frets to be at least 1 for the home placement. Keys past fret 12 (E to F-sharp start high): there is no lower placement, so the window just goes up; check the highest fret stays at most 24.
- Window the board per chord shape, not per beat, so only one dot moves when one note changes.

## 6. Tests

Run from `tests/`, with the browser path set (the variable does not survive between tool calls, so set it each time): `CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node <script>.js`. Do not rebuild while a run is in progress.

- `drop2-theory.js` (node only): all 12 keys: spellings, intervals, frets, Drop 2 derivation, the one-note chains, slash names, the walk (closest voice leading checked by brute force).
- `fonts.js`: symbol codepoints are in the font's cmap and drawn by MuseJazz Text, no fallback. `drop2.js`: circles, constant height, overflow at 320/360/390, labels in all 12 keys, only the right dots move, explore combinations, share PNG.
- Lesson 1: `labels2`, `circles`, `tutorial`, `fit`, `wrap`, `full`, `shots2`, `share`, `persist`, `subpath`. `tests/notation.js` loads the notation module so tests assert names through the same function.
- Pattern for a new lesson: pure theory in a `.ts` file, test it for all 12 keys in node (fast), then drive the page by `location.hash` (`#s5b3`) and read data attributes (`data-s`, `data-f`, `data-voice`) instead of pixels.
- Screenshots go in `renders/`. Look at them: tofu boxes and collisions only show there.

## 7. Gotchas we hit

- PUA glyphs render as tofu in the sans font: set the font on the span (section 2). The canvas share image needs the same font stack, and `document.fonts.load(...)` with the title text before drawing.
- Headless Chrome with mobile emulation has `navigator.share`, so the download path never runs: tests stub `navigator.canShare` and `navigator.share` and read the file.
- Board labels collide with string and fret lines: give text a page-colour stroke with `paint-order: stroke`, and sit it off the string (above the line, away from the ring). Check every key, both label modes, and the board edge.
- Double flats look like one blob at 11px: put a little letter-spacing between the two signs (in pips and in board labels).
- Tabs at 390px: seven chord tabs need 11.5px type; three "Bass on String N" tabs fit at 12px. Test clipping at 320.
- Where you are lives in the URL hash (`#s5b3`), which also makes tests simple. A run that changes the hash after the lesson mounts needs a short wait.
- A `cat > file` with no heredoc waits for stdin and hangs a tool call. `sleep` loops in tool calls are blocked: wait with a monitor or a `timeout` loop.

## 8. Workflow

- Do not push or open PRs unless asked. Local commits are fine; name files in `git add` (a hook forbids `git add -A`). `rm` is denied.
- Leave unrelated untracked files alone (fonts/Petaluma*, tests/fontprobe*.js, tests/live*.js, tests/mixo.js).
- Forma: `forma redeploy` (after `forma login --server https://tryforma.com`) needs confirmation; use `--clean` when files moved. GitHub Pages redeploys on push to `main`.

## Checklist for a new lesson

1. Folder + `lesson.json` + `main.tsx` + `lesson.tsx` (+ `theory.ts`); `node build.mjs`.
2. Chord names only through `chordSymbol`; notes and intervals only as pips; root red; paths through `SITE_ROOT`.
3. Beats: one sentence, one change, unchanged dots stay put; same rows on every step; Explore last.
4. Tutorial steps, Helps-to-know list, credit link if an outside page informed the topics.
5. Theory test for all 12 keys; browser test for circles, height, overflow, labels, share; fonts test.
6. Screenshots at 390 (and 320) of every beat; look for tofu, collisions, clipping.
7. Update the root `README.md` table, the lesson `README.md`, this guide if you learned something.
8. Commit by file name; do not push unless asked.
