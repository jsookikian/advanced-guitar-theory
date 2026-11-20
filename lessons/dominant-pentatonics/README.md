# Dominant Pentatonics and Half Diminished Chords

The first lesson of the Advanced Guitar Theory site (see the root `README.md` for the site and how lessons are added). It is an interactive guitar-fretboard lesson that started as Jordan's sheet "How to use Half Diminished / Minor 6 arpeggios to play over dominant chords" (*The 9 approach*), which is in `source-material/` at the repo root. It was first built as a single-file React page on a Grok Bot canvas, and this repository is now its home: edit `src/lessons/dominant-pentatonics/lesson.tsx` here. The canvas copy is no longer updated.

- Source: `src/lessons/dominant-pentatonics/` (`lesson.tsx`, `main.tsx`)
- Built page: `lessons/dominant-pentatonics/index.html` + `app.js`, committed
- Old canvas (history only): id `ca685305-4ea9-4daa-9f3e-16974001e252`; the Grok-hosted site was sign-in gated

## Purpose

The lesson teaches one idea. Over a dominant chord (C7), drop the root and add the 9 and you get four notes, E G Bb D. Those four notes are **C9 without the root**, **Eø (E half-diminished)** and **Gm6**: the same shape with three names. Put the root back and you have the **C dominant pentatonic** (1 9 3 5 b7). Add the 4 and 6 and you have **C Mixolydian**. Then grab the same notes as **Drop 2 / Drop 3** chord voicings, and move the five shapes over the whole neck.

## Music theory

C dominant pentatonic: **C D E G Bb** (1 9 3 5 b7). Remove C and you get E G Bb D.

| Note | from C (C9) | from E (Eø) | from G (Gm6) |
|---|---|---|---|
| C  | **R** | b6 | 4 |
| D  | 9 | b7 | 5 |
| E  | 3 | **R** | 6 |
| G  | 5 | b3 | **R** |
| Bb | b7 | b5 | b3 |
| *F (Mixolydian 4)* | 4 | b2 | b7 |
| *A (Mixolydian 6/13)* | 6 | 4 | 2 (9) |

- **Eø** = E G Bb D (1 b3 b5 b7), built on the **3** of C.
- **Gm6** = G Bb D E (1 b3 5 6), built on the **5** of C.
- **C9 (no root)** = E G Bb D (3 5 b7 9).

**All 12 keys.** Everything is computed from the key's pitch class. Notes are spelled with correct letter names (`spell()`): Db, F#, Bb and so on, never mixed sharps and flats. The iii and v chords move with the key: in F they are Aø and Cm6, in A they are C#ø and Em6.

**Five shapes.** The dominant pentatonic box shapes are defined in `BOX`. Each shape's highest note on every string is the next shape's lowest note on that string, and Shape 5 joins Shape 1 an octave up.

**One position, three CAGED shapes.** Which CAGED form a box is depends on the root you count from. Look at where the frame root sits inside the box: the strings carrying it match one of the five forms (C: strings A and B; A: A and G; G: low E, G and high e; E: low E, D and high e; D: D and B). The same position therefore has a different name from C, from E (Eø) and from G (Gm6):

| Shape | from C (C9) | from E (Eø) | from G (Gm6) |
|---|---|---|---|
| Shape 1 | A | D | E |
| Shape 2 | G | C | D |
| Shape 3 | E | A | C |
| Shape 4 | D | G | A |
| Shape 5 | C | E | G |

The table is `CAGED` in `lesson.tsx` and does not depend on the key: checked for every shape copy in all 12 keys and all three frames (321 cases, none ambiguous). The Explore card states it for the current shape ("Shape 5: the C shape from C, the E shape from E (Eø), the G shape from G (Gm6)"), the Shape buttons carry it in their tooltips and screen-reader labels, and the share image names the shape by the current Count-from frame. This replaced the earlier per-shape chord names ("C9 / Eø", "Gm6"...), which an audit found were not supported by each shape's lowest notes.

**Whole neck.** `instances(key)` lists every copy of the five shapes that fits on frets 0–24, sorted from the nut upward. That gives 9 per key, except D, which has 8. The arrows (and swipe, on cards other than Explore) step through this list and stop at the nut and at the top; they grey out there. The long moves are the Shape buttons and the octave step below.

**Drop 2 / Drop 3.**
- **Drop 2:** a close-position E G Bb D chord with the second note from the top dropped an octave. The fingering per shape is in `DROP2`.
- **Drop 3:** in this lesson, Drop 2's top note (on the high e) moves to the same fret on the low E. The bass note changes, and so does the chord's name.

**Voicing names.** Chord names come from the "Count from" chord (C9, Eø or Gm6), shown as inversions (`vname()`): the plain name when that chord's root is in the bass, otherwise `chord/bass`, e.g. `Eø/G`, `Gm6/E`. From C the root is never in these voicings, so the C9 frame reads "C9 no root" instead of a slash chord (a slash would tell the bassist to play the E). Checked for 12 keys × 5 shapes × 2 voicings × 3 frames against the lowest sounding pitch by an independent script.

## How to run

You need Node 18 or newer.

Run these from the repo root:

```bash
npm install
npm run build          # builds every lesson and the catalog (a built copy is committed)
npm run serve          # static server on http://localhost:8000; this lesson is at /lessons/dominant-pentatonics/
npm run typecheck      # tsc -p . (passes)
```

`lesson.tsx` imports React hooks from `"grok/canvas"`, a module name inherited from the canvas host. `src/shared/grok-canvas-shim.ts` re-exports them from React, and `build.mjs` and the tsconfig `paths` point `grok/canvas` at the shim. Keep the imports as they are. `main.tsx` mounts the default export.

## Tests

The tests are in `tests/`. They use puppeteer-core with headless Chrome against the lesson page, served by `tests/site.js` (a tiny static server over the repo root: the pages use root-absolute asset paths because Forma serves every page with `<base href="/">`, so they can't be opened from `file://`). Build first.

```bash
cd tests && npm install
CHROME=/path/to/chrome node labels2.js
```

| Script | What it checks |
|---|---|
| `labels2.js` | Every card × layer × shape 1–5 × Intervals/Notes × Count from (360 cases, about 4,900 dots). Checks each label against the theory, the red R only on the root, the legend, the chord names and the page-wide frame. Last run: 0 failures. |
| `wrap.js` | All 12 keys. Walks every shape copy, checks order, frets 0–24, no missing copies, dots inside the board window, that the arrows disable at the nut and at the top (no wrap), and that both the 8va button and tapping the selected Shape step the same shape up 12 frets and back to the lowest, with a remount. Last run: 0 failures. Set `KEYS=C,F#` to limit keys. |
| `shots2.js` | Board top position per card at 320, 390 and 1280 (no layout shift), card text overflow, sideways scroll, and the settings panel. Writes the three `lesson_390_*` renders. |
| `fit.js` | Step labels fit at 320, 360 and 390 with 32px tap targets, and the Shape 1–5 buttons fit. |
| `full.js` | The Explore card at 320 and 390: the neck is scrollable, the shape is centred on load and after every arrow step and Shape button, the board height matches the other cards, Fit all shows the band and keeps the height. Writes `scroll390.png`, `scroll320.png` and `full390.png` to the current directory. |
| `tip.js`, `tip2.js` | Hover labels: their text, kept inside the viewport, focus-visible, and that they hide when the pointer leaves. Renders tooltip screenshots. |
| `legacy/` | Checks written for the earlier 14-step version: share PNG download, fret-number gap, overflow, arrows. Their selectors may need updating for the 7-card layout. |

## Architecture (`src/lessons/dominant-pentatonics/lesson.tsx`, one file)

**Data model**
- `Dot {s, f, d, add}` is a string (0 is the low E), a fret, a degree in semitones above the key, and whether it is a Mixolydian addition.
- `KeyDef {id, pc, letter}` describes a key.
- `Pos` is one shape copy: its dots, lowest and highest fret, and the Drop 2 / Drop 3 note sets.

**Theory helpers**
- `spell()` spells a note name correctly for the key.
- `ivName()` names an interval from a chosen root.
- `degOf()` gives a dot's degree.
- `buildPos()` builds one shape copy, `instances()` lists every copy on the neck, and `shapeName()` names a shape.

**Layers (Mode)**
- `chord` shows C7 chord tones.
- `arp` shows the four-note arpeggio, with the 9 in teal.
- `penta` adds the root back.
- `mixo` adds the 4 and 6 as dashed dots.
- `grip` shows Drop 2 and `drop3` shows Drop 3.

`modeDots()` picks which dots each layer shows and `look()` sets their fill, ring and dash.

**Board**
- An SVG of a 7-fret window. The neck group slides with a CSS transform (560 ms).
- All 150 or so possible scale dots are drawn once and fade or scale in and out, so moving between layers and shapes is animated.
- Fret numbers sit about 12px below the low-E dots.
- The ‹ › arrows and swipe step through the shape list and stop at the ends (no wrap-around).
- **Octave step** (Explore): the same shape one octave up or down, from the highest copy up to the lowest and back, with a 300 ms fade (the board remounts) because the board jumps. Two ways in: the small "− Octave +" pair in the legend row, and tapping the Shape button you are already on (it goes up; its tooltip says so). This is how you get between the open-string copy at the nut and its moveable twin at the 12th fret. Disabled when a shape has only one copy (Shape 4 in D).
- **Scrolling neck** (the Explore card's default, `scroll` prop): the whole neck, frets 0–24, is drawn at the same dot size as the zoom view inside a native horizontally scrolling box (`#nine-scroll`), so a phone user can swipe along it. When the player scrolls by hand and stops, the shape nearest the middle becomes the current one (the Shape bar, legend and lit dots follow), so the screen never shows an unlit stretch of neck; scrolls the page started itself are ignored. The shape is centred in the box: on mount the placement is instant (so a wrap fades in already centred), and after an arrow or Shape button the box glides to the new shape. The string names are pinned over the left edge (right edge when left-handed). The board's width, height and dot size equal the zoom view's, so nothing around it moves. Swipe-to-step is turned off here because a horizontal swipe scrolls instead; the arrows and Shape buttons still step.
- **Fit all** (Settings → Neck): the `full` prop draws frets 0–24 at once in the zoom view's viewBox (about 12.8 units per fret, dots of radius 6.3 with 7.5px labels, only the marker frets numbered). Only the current shape is lit, on a faint teal band that slides as the shape changes. The choice is kept while you stay on Explore.
- The other six cards keep the 7-fret window that slides with a CSS transform. Share copies the live SVG, so on Explore it shares the whole neck.

**The lesson: 7 guided steps and Explore (`CARDS`, `BEAT_SPEC`, `beatContent`)**

Each guided step is a short run of **beats**. A beat makes one statement, lights only the notes that statement is about and dims everything else. Continue and Back walk through the beats and then on to the next step; the small dots above the heading show the beat. Guided steps are pinned to Shape 1 (so the board never moves), have no shape bar or arrows, and have a full-width "Hear it" button (it plays the lit notes, each pulsing as it sounds) where the shape bar would be.

| Step | Beats |
|---|---|
| C7, the chord | the four chord tones (the unused 9 dimmed) · the root alone, red · the 3, 5 and b7 |
| Lose the root | the roots alone ("the bass player covers this") · the roots fade out · what is left still says C7 |
| Add the 9 | the 9 alone, teal · the four notes again · "These four notes, E G Bb D, are Eø or Gm6" |
| Chord Synonyms | the same four notes read from E (R b3 b5 b7, Eø) · from G (Gm6) · over a C bass (C9 no root) |
| The dominant pentatonic | the four notes · the root comes back · the arpeggios hidden inside |
| C Mixolydian | the two gaps · F and A fill them · A is the 13 · F is the avoid note |
| Play it as a chord | Drop 2 · Drop 3 |
| Explore | the free neck (below) |

How the dimming works: `BEAT_SPEC` says per beat which degrees (or "penta", "drop2", "drop3") are lit, which root the labels count from (`ring`) and which look to use; `Board` fades every other dot (`dim`). The page around the board is dimmed too: on guided steps the title row, progress chips and settings button sit at about 40% (they come back on hover or focus), and tapping a note name in a sentence runs a **spotlight**: for 1.5 s everything else (all text, controls, every other dot) drops to almost nothing, and that note's dots light in the chip's colour (root red, the 9 teal, the rest ink) and play.

Note names in the sentences are small bold dots (`chip`) in the same colours as the board's dots.

Under the board, bold and centred, is the **chord name** for the current beat ("C7", "C7 no root", "C9 no root", "Eø", "Gm6", "C dominant pentatonic", "C Mixolydian", "C9 no root · Drop 2"). On Explore it names the layer.

The chips read C7 · No root · The 9 · Synonyms · Pentatonic · Mixolydian · Drop · Explore. "Synonyms" reads "Chord Synonyms" at 560px and wider (a CSS swap, so it fits at 320). Chip widths follow label length, with a 28px minimum, and the type steps down at 340px.

**Explore:** the scrolling neck with the five layer buttons (Arpeggio, Pentatonic, Mixolydian, Drop 2, Drop 3) on the card, the Shape 1-5 bar and the arrows. Practice and Quiz were removed on purpose until there is a better plan for how to practise this; see `CONTEXT.md`.

**Navigation**
- Back / Continue (and the arrow keys) walk the beats, then the steps. The progress chips jump to the start of any step.
- On Explore, the **Shape 1** to **Shape 5** buttons are a full-width segmented control above the board that jumps to the nearest copy of that shape. At 380px and narrower each button stacks a small "Shape" caption over a larger number. There is no shape name or fret caption beside them.
- The position on the neck carries across Explore; changing key keeps the same shape at the nearest position.

**Intervals | Notes** is a small pill in the legend row, always visible (it is not in Settings).

**Settings** (sliders icon and chevron in the legend row; an inline panel that stays open across cards)
- Count from: C9 / Eø / Gm6. This one setting applies to every card.
- Sound: Nylon acoustic (default) / Steel acoustic / Jazz electric. Built out later.
- Key (12 keys)
- Left-handed (mirrors the board)
- Neck: Scroll | Fit all (applies on the Explore card only; greyed elsewhere)
- Share image (a button at the bottom of the panel; the legend row now holds only the legend and the settings button)

**Share**
- Draws a 1080×1080 paper-white PNG: the full lesson title, key and label line, heading (the shape named by the current Count-from frame, e.g. "Shape 5: C shape from C · Pentatonic"), legend, a static copy of the board and the site name.
- On the scrolling neck it shares the window on screen (a zoom-sized slice, with the string names drawn in), not the whole 24 frets. Notes that are only faded on screen (the ghosts around a Drop chord) are left out.
- Uses `navigator.share` on touch devices (`pointer: coarse`) when `canShare({files})` allows it, otherwise downloads a file named like `c9-shape1-fret2-pentatonic.png`. On desktop it always downloads.

**Sound** (`src/shared/audio.ts`, shared by all lessons)
- Recorded guitar notes, modelled on how Oolimo.com does it: one sample per pitch, nothing downloads or sounds until the first tap (browsers require a gesture), a note per tap, chords as staggered notes.
- The samples are the FluidR3 GM soundfont (Frank Wen, CC BY 3.0) as packaged by gleitz/midi-js-soundfonts, vendored in `sounds/` (nylon, steel and jazz electric, about 6 MB in all; see `sounds/README.md`). Only the chosen instrument's file is fetched, once, on the first tap; each pitch is decoded the first time it is played. If the file can't be fetched (for example the page was opened from `file://`) a synthesised pluck stands in. The attribution is on the catalog page.
- Tap a lit dot to hear it; the dot pulses. The play triangle in the legend row plays what is shown: the notes ascending as an arpeggio, or the chord strummed on the Drop cards. Each note pulses as it sounds. While it plays the button is a stop square; it stops when pressed, when the phrase ends, or when anything on the board changes (card, shape, key, layer, Count from, Show).
- There is deliberately no backing note: a bass note under the notes sounded wrong. A proper backing chord belongs to a later practice design.
- iOS plays web audio only when the ringer switch is on.

**Hover labels**
- One styled tooltip for the progress segments, shape buttons, arrows and the settings button. Shape buttons and arrows still name the shape and frets here (e.g. "Shape 2 · G shape from C, C from E, D from G", "Shape 3 · frets 5–8").
- Shows on mouse hover, keyboard focus-visible, or a touch long-press.

**`lockPaint()`**
- Re-applies every colour as an inline `!important`.
- Undoes any invert filter a host page puts on a parent.
- Purpose: forced dark modes and host themes can't repaint the white sheet.

## Design rules (keep these)

**Palette** (white paper, light only: `color-scheme: only light`, never auto-dark)

| Role | Colour |
|---|---|
| Paper | `#fdfcfb` |
| Ink | `#4d3533` |
| Secondary ink | `#806a68` |
| Lines | `#dcd5d4` |
| Teal | `#0f766e` |
| Root red | `#b42318` |

**Type:** serif headings (Aime, Georgia), sans body (KMR Melange Grotesk, system fallback).

**Roots:** every root is a red filled dot labelled **R**. With Notes on, it shows the note name instead.

**Text placement:** all copy sits **above** the board, with one exception Jordan asked for: the chord name, bold and centred, directly under the board. Below that only Back / Continue.

**No layout shift**
- Cards have a fixed height with text aligned to the bottom, so the board never moves between cards 1–6. The Explore card is 26px taller, on purpose.
- Full neck keeps the board's top and height exactly as in zoom.
- The legend row has a fixed minimum height.
- The settings panel moves things only when it is toggled.

**No sideways scroll** at 320, 360, 390 and 430 wide, with settings open or closed.

**Wording**
- Short, teaching tone, and it says *why* the pieces fit together.
- The 4 and 6 over a dominant are written as the 4 and the 13. The 4 is called the avoid note (a b9 above the 3). Over Eø the same note shows as b9, never b2.
- "Drop 2" / "Drop 3", never "grip" in visible text.
- Jordan's wording "These four notes, E G Bb D, are Eø or Gm6" (it follows the key, no full stop) is the last beat of "Add the 9". The other beats are new copy, to be edited.

**Motion:** fades and slides of about 120–560 ms.

**Spacing:** 8px rhythm; controls and the Shape buttons are 36px tall, the progress segments 32px.

## Folder map

| Folder | Contents |
|---|---|
| `src/lessons/dominant-pentatonics/` | `lesson.tsx` and `main.tsx` |
| `lessons/dominant-pentatonics/` | `lesson.json`, this README and `CONTEXT.md`, and the built `index.html` + `app.js` |
| `source-material/` (repo root) | The original sheet: its text, a full-page capture and part captures, plus the first live capture and restyle reference images |
| `renders/current/` (repo root; shots from before the Shape and full-neck changes) | Renders of the current version: card 1, Explore, wrap at the nut, hover labels, and the standalone build at 390 |
| `renders/share-samples/` | Share PNGs |
| `renders/history/` | Renders of earlier versions (14-step lesson and before) |
| `tests/` | The check scripts above |
| `CONTEXT.md` | History of the feedback, current state, open items |

## Hosting on Forma

This lesson is part of the site described in the root `README.md` and `context/SPACE.md`. After changing `src/`, run `npm run build` and commit the generated `lessons/dominant-pentatonics/app.js` with the source; deploy with `forma redeploy`.
