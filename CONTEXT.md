# Project context: what we did and why

Owner: Jordan. The work was done by Grok Bot on canvas `ca685305-4ea9-4daa-9f3e-16974001e252` (20 Nov 2026).
The starting point was Jordan's sheet "How to use Half Diminished / Minor 6 arpeggios to play over dominant chords" (*The 9 approach*). See `source-material/`.

## Feedback history, oldest first

Each item is a request from Jordan, then what was done.

1. **Restyle the sheet as an interactive fretboard.** Done with the white paper look (`#fdfcfb` paper, `#4d3533` ink, teal and red), serif and sans type, fades, and the neck slide. `lockPaint()` was added so forced dark modes can't invert the page.
2. **Design pass.** Zero layout shift, a 36px control system, a step line, 8px rhythm, checked at 390 and 1280. Done (`renders/history/final_390.png`, `final_1280.png`).
3. **Turn it into a guided, Duolingo-style lesson.** Done: cards with a progress bar, Back / Continue, settings hidden, and Parts 1–3 (14 steps).
4. **Remove the ~80px blank gap above short cards.** Done: cards are bottom-aligned and the shape text was tightened.
5. **Show every root as a red "R" circle (`#b42318`).** Done, with the legend and copy updated.
6. **Replace the settings gear with a sliders ("adjust") icon and chevron, out of the title area.** Card 2 text set exactly to "The Cs fade out, D fades in. These four notes, E G Bb D, are Eø or Gm6". Done.
7. **Settings drop-down under the card text, above the board, staying open across steps.** Done as an inline panel. It doesn't close on Esc or a click outside.
8. **Notes didn't work on every slide.** Fixed: one page-wide Show setting, tested by script. Also fixed in that pass:
   - Sideways scroll on phones (checked at 320, 360, 390 and 430).
   - "Drop 2 voicing" renamed to "Drop 2".
   - Drop 3 slash names, with the line "Drop 3: the top note drops to the low E, so the bass changes, and so does the name."
9. **Share button for a shareable PNG.** Done: a 1080×1080 paper-white image, using the share sheet where supported, otherwise a download. Samples are in `renders/share-samples/`.
10. **Count from didn't work on every slide.** Fixed: one page-wide setting, and card 3's buttons set it. Tested.
11. **Fret numbers too close to the dots.** Fixed: about 12px gap at 390.
12. **Add ‹ › arrows to move shapes up and down the neck.** Done, plus swipe.
13. **"The 14 steps don't really make sense; past either end, go all the way to the other end of the fretboard."** Done:
    - The lesson became **7 cards**: C7, No root, Names, Penta, Mixo, Drop (Drop 2 | Drop 3), and Explore (Explore | Practise | Quiz).
    - The arrows and swipe work on every card, step through every shape copy from fret 0 to 24, and wrap at both ends with a quick fade.
    - That makes 9 shape copies per key (8 in D). Tested in all 12 keys.
14. **"Assess EVERY piece of info and its placement; make it easy to jump between things."** Done:
    - Audit (table below).
    - Subtitle cut.
    - "Step x of N" text merged into tappable progress segments.
    - Shape name and frets moved next to new Shape 1–5 buttons above the board.
    - The legend names the Drop chord in Explore.
15. **"Clickable segments or tabs."** Done: labelled progress segments with 32px tap targets, fitting at 320.
16. **"Hover over should have a nice label."** Done:
    - Styled hover labels on the progress segments (e.g. "3 · Same notes, three names").
    - Arrows show the next or previous shape and frets, and note when they wrap.
    - Shape buttons, share and settings also have labels.
    - Kept inside the screen; they show on keyboard focus and on a touch long-press.
17. **Latest requests: Chord Synonyms, full-neck mode, "Shape N" buttons.** Not done; the zip export was asked for before they were started. See open items.
18. **Export the whole project as a zip with instructions and context.** This package.

## Current state (as published and exported)

- **Cards:** 7, with tappable labelled progress segments: C7 · No root · Names · Penta · Mixo · Drop · Explore.
- **Shape row** (above the board): buttons **1 2 3 4 5** (bare numbers), then "C9 / Eø · frets 2–6" on the right.
- **Legend row:** the legend, then the share icon, then the settings icon and chevron. The inline settings panel holds Show, Count from, Key and Left-handed.
- **Board:** a 7-fret window with ‹ › arrows on the sides and swipe. Both wrap across frets 0–24.
- **Below the board:** Back / Continue (Start over on the last card).
- **Tests at export:**
  - `labels2.js`: 540 cases, 0 failures.
  - `wrap.js`: all 12 keys, 0 failures.
  - Layout: board position unchanged on cards 1–6, Explore 26px lower; no sideways scroll at 320, 390 or 1280.
  - The standalone build in `src/` renders in headless Chrome with no console errors.

## Audit (from step 14)

| Element | Verdict | Why |
|---|---|---|
| Title | Keep | Names the lesson; also used on the share image |
| Subtitle | Cut | Repeated the title and cards; saved about 20px |
| "Step x of N" text and plain bar | Merge | Became the tappable labelled segments |
| Shape name and frets | Move | Beside the shape buttons, above the board |
| Card headline and text | Keep | About the idea; shape detail stays short |
| Card 3 chord buttons vs Count from | Keep both | Same page-wide setting on purpose |
| Layer toggle | Moved to Explore and Quiz | Cards 1–6 each fix their layer |
| "Up the neck" cards, Part names, shape toggles on Practise and Quiz | Cut | Replaced by the arrows, shape buttons and one line per shape |
| Drop 2 and Drop 3 cards | Merge | One card with a toggle |
| Practise and Quiz cards | Merge | Part of the Explore switch |
| Legend | Keep | Names the Drop chord in Explore |
| Share and settings | Keep | Have hover labels |
| Arrows and swipe | Keep, extended | Whole neck with wraparound |
| Back / Continue | Keep | Simple linear path |

## Open items

| Item | Status |
|---|---|
| Declutter review (the audit pass) | **Done** (step 14). The judgement calls below are still open. |
| Judgement call: Back / Continue now partly duplicates the segments; could become Continue only | **Not decided.** Left as is; Jordan didn't choose. |
| Judgement call: a Key chip in the shape row (key is currently 2 taps away, in settings) | **Not decided, not done.** |
| Judgement call: Explore card is 26px taller (board drops 26px there only); alternative is shortening the Practise text so every card is the same height | **Not decided.** Left as is. |
| Judgement call: bring the subtitle back | **Not decided.** It stays cut. Bringing it back would restore the line "One shape, three names, the whole neck." under the title. |
| Judgement call: spare space above short cards (from the fixed card height) | **Not decided.** Left as is. |
| Rename the "Names" segment and its hover label to **"Chord Synonyms"** (must fit at 320; consider echoing it in the card 3 headline) | **Not done.** Still "Names" and "3 · Same notes, three names". |
| **Full-neck mode** for Explore: Zoom / Full neck toggle; frets 0–24 at once with only the current shape lit; smaller dots; arrows, shape buttons, wrap, layers, settings, R, Drop 2/3 and share all working; no layout shift | **Not done.** The planned approach is below. |
| Shape buttons reading **"Shape 1" to "Shape 5"** as a full-width segmented control (at 320, a small "Shape" caption above a larger number), never bare numbers | **Not done.** Still bare 1–5. |
| Other label wording changes mentioned for "Pentatonic" and "Practice" | **Not done.** Still "Penta" segment / "Pentatonic" layer and "Practise" (UK spelling). |
| Remove the "C9 / Eø · frets x–y" caption from the shape row | **Not done.** Still shown. It's the only place the shape name and frets appear on every card, so they need a new home first. |

**Planned full-neck approach (not built).**
- Give `Board` a `full` prop. In full mode it shows frets 0–24 at about 13.3 units per fret, inside the same 356-unit-wide viewBox with the same string spacing, so the board height doesn't change.
- Dots shrink to radius about 6.3 with labels at about 7.5px; only the marker frets are numbered.
- A faint teal band behind the current shape slides as the shape changes.
- Toggling remounts the board with a fade. The setting is kept while on Explore.
- Share needs no change: it copies the live SVG.

## Known caveats

- **iOS share sheet untested.** `navigator.share({files})` has only been exercised through the download path in headless Chrome. The share sheet on a real iPhone or Android hasn't been tried.
- **Live URL not checked headless.** The published site is sign-in gated, so every check ran against local builds of the exact canvas source, not the live host. The canvas page itself type-checks and publishes.
- **Fonts.** "Aime" and "KMR Melange Grotesk" come from the host. Standalone builds fall back to Georgia and system sans, so label widths differ slightly.
- **Legacy tests.** The scripts in `tests/legacy/` target the 14-step layout and may need new selectors.
- **Unverified share rename.** After the 7-card change, the share file name uses the fret instead of "8va". The download test wasn't re-run after that change.
