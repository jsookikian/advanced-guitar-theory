# Dominant Pentatonics and Half Diminished Chords

An interactive guitar-fretboard lesson. It started as Jordan's sheet "How to use Half Diminished / Minor 6 arpeggios to play over dominant chords" (*The 9 approach*), which is in `source-material/`. It was rebuilt as a single-file React page on a Grok Bot canvas.

- Canvas id: `ca685305-4ea9-4daa-9f3e-16974001e252`
- Canvas page: https://cursor.com/canvas/store-99cb95d5-6e0e-469e-b159-5d8665241032/ca685305-4ea9-4daa-9f3e-16974001e252
- Published site: https://the-9-approach-interactive-fretboard-b6ho.pages.grok.bot (sign-in gated)

`src/lesson.tsx` is byte-for-byte the source published on the canvas at export time (20 Nov 2026).

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

**Five shapes.** The dominant pentatonic box shapes are defined in `BOX`. Each shape's highest note on every string is the next shape's lowest note on that string, and Shape 5 joins Shape 1 an octave up. Shape names in C (named by what the low notes suggest):

| Shape | Name |
|---|---|
| Shape 1 | C9 / Eø |
| Shape 2 | Gm6 |
| Shape 3 | C9 |
| Shape 4 | Gm6/D |
| Shape 5 | Eø |

**Whole neck.** `instances(key)` lists every copy of the five shapes that fits on frets 0–24, sorted from the nut upward. That gives 9 per key, except D, which has 8. The arrows and swipe step through this list and wrap at both ends.

**Drop 2 / Drop 3.**
- **Drop 2:** a close-position E G Bb D chord with the second note from the top dropped an octave. The fingering per shape is in `DROP2`.
- **Drop 3:** in this lesson, Drop 2's top note (on the high e) moves to the same fret on the low E. The bass note changes, and so does the chord's name.

**Slash names.** Chord names come from the "Count from" chord (C9, Eø or Gm6), shown as inversions (`vname()`). The plain name is used when that chord's root is in the bass, otherwise it is `chord/bass`, e.g. `Eø/G`, `Gm6/E`, `C9/Bb`. This was checked for 12 keys × 6 shapes × 2 voicings × 3 frames, 432 names in all.

## How to run

You need Node 18 or newer.

```bash
npm install
npm run build          # bundles src/main.tsx to app.js at the root (a prebuilt copy is committed)
open index.html        # or any static server; it works from file://
npm run serve          # dev server with rebuild on save (esbuild --servedir)
npx tsc -p .           # type-check (passes)
```

`lesson.tsx` imports React hooks from `"grok/canvas"`, the canvas host's module. Outside the canvas, `grok-canvas-shim.ts` re-exports them from React, and the esbuild alias / tsconfig `paths` point `grok/canvas` at the shim. `main.tsx` mounts the default export.

**Editing.**
- To change the live page, edit `lesson.tsx` and paste it back into the canvas (or have Grok Bot apply the edit to canvas `ca685305-…`). The canvas type-checks on publish.
- Keep the imports to `"grok/canvas"` so the file still runs on the canvas.

## Tests

The tests are in `tests/`. They use puppeteer-core with headless Chrome against `index.html`; build first.

```bash
cd tests && npm install
CHROME=/path/to/chrome node labels2.js
```

| Script | What it checks |
|---|---|
| `labels2.js` | Every card × layer × shape 1–5 × Intervals/Notes × Count from (540 cases, about 7,300 dots). Checks each label against the theory, the red R only on the root, the legend, the chord names and the page-wide frame. Last run: 0 failures. |
| `wrap.js` | All 12 keys. Walks every shape copy, checks order, frets 0–24, no missing copies, dots inside the board window, both wrap directions, and the wrap fade (board remount). Last run: 0 failures. Set `KEYS=C,F#` to limit keys. |
| `shots2.js` | Board top position per card and mode at 320, 390 and 1280 (no layout shift), card text overflow, sideways scroll, and the settings panel. Writes the three `lesson_390_*` renders. |
| `fit.js` | Step labels fit at 320, 360 and 390 with 32px tap targets. |
| `tip.js`, `tip2.js` | Hover labels: their text, kept inside the viewport, focus-visible, and that they hide when the pointer leaves. Renders tooltip screenshots. |
| `legacy/` | Checks written for the earlier 14-step version: share PNG download, fret-number gap, overflow, arrows. Their selectors may need updating for the 7-card layout. |

## Architecture (`src/lesson.tsx`, one file)

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
- The ‹ › arrows and swipe step through the shape list. Wrapping remounts the board with a 300 ms fade instead of sliding 20 frets.

**Cards (`CARDS`, 7)**
1. C7
2. No root
3. Names: same notes, three names (also sets Count from)
4. Penta
5. Mixo
6. Drop: Drop 2 | Drop 3 toggle
7. Explore: an Explore | Practise | Quiz switch. Practise has a "Show path" line drawing; in Quiz, tapping a dot reveals its label.

**Navigation**
- The labelled progress segments are tappable, so any card is one tap away. Back / Continue are also there.
- The Shape 1–5 buttons jump to the nearest copy of that shape.
- The position on the neck carries across cards.
- Changing key keeps the same shape at the nearest position.

**Settings** (sliders icon and chevron in the legend row; an inline panel that stays open across cards)
- Show: Intervals / Notes
- Count from: C9 / Eø / Gm6. This one setting applies to every card.
- Key (12 keys)
- Left-handed (mirrors the board)

**Share** (icon next to settings)
- Draws a 1080×1080 paper-white PNG: title, key and label line, heading, legend and a static copy of the board.
- Uses `navigator.share` when `canShare({files})` allows it, otherwise downloads a file named like `c9-shape1-fret2-arpeggio.png`.

**Hover labels**
- One styled tooltip for the progress segments, shape buttons, arrows, share and settings.
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

**Text placement:** all copy sits **above** the board. Nothing goes below the board except Back / Continue.

**No layout shift**
- Cards have a fixed height with text aligned to the bottom, so the board never moves between cards 1–6. The Explore card is 26px taller, on purpose.
- The legend row has a fixed minimum height.
- The settings panel moves things only when it is toggled.

**No sideways scroll** at 320, 360, 390 and 430 wide, with settings open or closed.

**Wording**
- Short, teaching tone, and it says *why* the pieces fit together.
- "Drop 2" / "Drop 3", never "grip" in visible text.
- Card 2's text is exact: "The Cs fade out, D fades in. These four notes, E G Bb D, are Eø or Gm6" (it follows the key, no full stop).

**Motion:** fades and slides of about 120–560 ms.

**Spacing:** 8px rhythm; controls are 36px tall, the progress segments and shape buttons 32px.

## Folder map

| Folder | Contents |
|---|---|
| `src/` | `lesson.tsx` (published source), `grok-canvas-shim.ts`, `main.tsx`; the root holds `index.html`, `app.js` (build output), `package.json`, `tsconfig.json`, `forma.yaml` |
| `source-material/` | The original sheet: its text, a full-page capture and part captures, plus the first live capture and restyle reference images |
| `renders/current/` | Renders of the current version: card 1, Explore, wrap at the nut, hover labels, and the standalone build at 390 |
| `renders/share-samples/` | Share PNGs |
| `renders/history/` | Renders of earlier versions (14-step lesson and before) |
| `tests/` | The check scripts above |
| `CONTEXT.md` | History of the feedback, current state, open items |

## Hosting on Forma

This repo is a Forma Managed web app space (`forma.yaml`, `context/SPACE.md`). Forma serves `index.html` and `app.js` from the repo root. After changing `src/`, run `npm run build` and commit `app.js` with the source.
