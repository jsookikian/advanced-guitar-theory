# Project context: what we did and why

Owner: Jordan. First built by Grok Bot on canvas `ca685305-4ea9-4daa-9f3e-16974001e252` (20 Nov 2026); since then this repository is the home of the lesson and Forma hosts it (see the root `README.md`).
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
17. **Latest requests: Chord Synonyms, full-neck mode, "Shape N" buttons.** Not done when the zip was exported; done below (items 20-24).
18. **Export the whole project as a zip with instructions and context.** That zip is the starting point of this repository.
19. **Make it a lesson-style site, with Dominant Pentatonics as one entry.** Done: a catalog at the root (`index.html`, generated), one folder per lesson (`lessons/<id>/`, source in `src/lessons/<id>/`), `build.mjs`, shared code in `src/shared/`. See the root `README.md` for adding a lesson.
20. **Finish everything in progress; remove the shape name and frets caption, no new home.** Done. The caption is gone. "Names" became **Chord Synonyms** (the chip reads "Synonyms" under 560px so it fits at 320), "Penta" became **Pentatonic**, "Mixo" became **Mixolydian**, "Practise" became "Practice" (and was then removed, item 23). The shape buttons are a single **Shape 1 to Shape 5** bar, full width, with a small "Shape" caption over the number at 380px and narrower. The title is one line ("Dominant Pentatonics") with an "All lessons" link.
21. **"That just looks so damn cluttered."** The legend row now holds only the legend, a play button and the settings button; share, the neck mode and the sound choice moved into Settings. The Explore card lost its switch row. Chips, shape bar and layer buttons use heavier outlines (3:1) and fit at 320.
22. **Explore should show a scrollable neck on mobile with the shape centred.** Done: native horizontal scroll over the whole neck at full dot size, the shape centred on load and after every arrow or Shape button, string names pinned at the left, and the nearest shape becomes current when the player scrolls by hand. The earlier "full neck" view became **Fit all** in Settings → Neck.
23. **Practice mode is somewhat random: remove Practice and Quiz until there is a plan for how to practise this.** Done: the Explore card is the neck with its layer buttons only. See "Practice" in the open items.
24. **CAGED names on the shapes.** Jordan's insight: one position is several CAGED shapes at once (Shape 5 is the E shape counting from Eø and the C shape counting from C7). Done as a table by shape and frame root, verified in all 12 keys; the Explore line, the tooltips and the share image use it. It replaced the old per-shape chord names.
25. **Sound, borrowed from how Oolimo.com does it.** Done: tap a dot to hear it, a play button for the shown notes (arpeggio, or the chord strummed), each note pulsing as it sounds, and the play button turning into a stop button while it plays. The first version was synthesised and "didn't sound good", so it now plays recorded guitar samples (FluidR3 GM, CC BY 3.0, nylon by default, steel and jazz electric behind a Sound setting that will be built out). A bass note under the notes was tried and removed ("weird").
26. **Shape at the nut: ‹ jumped to Shape 3 at frets 19-22.** Decision (a mix of three options): the arrows no longer wrap (they grey out at the nut and at the top); the same shape moves an octave by tapping the Shape button you are on, and by a new "8va" button in the legend row. That is how you get between the open-string Shape 5 and its moveable twin at the 12th fret.
27. **Make it a real lesson: guide the guitarist.** Jordan: the cards weren't guiding anyone; dim what isn't relevant to each statement, light what is, and do it as several steps per step. Done: every step is now a short run of beats (21 in all), each with one sentence, its own lit and dimmed notes, and a bold chord name under the board. The dimming reaches the whole page (guided steps quiet the title row, chips and settings; tapping a note name runs a spotlight that dims everything but that note). Note names in the sentences are tappable dots in the board's colours. See the lesson table in the README.
28. **Smaller asks along the way.** The Intervals | Notes toggle moved out of Settings into a small pill that is always visible. The octave control became "− Octave +". The spotlit dots take the chip's colour (the teal 9 was coming up black). The Hear it button and the play button turn into a Stop button while playing.
29. **Deploying exposed a platform rule.** Forma serves every page with `<base href="/">`, so a lesson page's relative `app.js` loaded the stale root file from the first deploy. Pages now use root-absolute paths (`/lessons/<id>/app.js`, `/sounds/`), the tests run against a small static server instead of `file://`, and the deploy used `forma redeploy --clean` to clear stale files.
30. **UI / QA, music-theory and guitarist reviews by Opus agents.** Findings applied: a scrolling bug that showed empty frets, a share image that was a thin strip of the whole neck (it now shares the window on screen, without ghost notes, with the full title and the site name), keyboard arrows changing the card while a radio was focused, a poor arrow hit area, chips too narrow to tap, outline contrast, no link back to the catalog, desktop share opening an OS sheet instead of downloading, missing favicon, "C9/E" style names for a rootless C9 (now "C9 no root"), the Mixolydian 4 presented as a passing note (now the avoid note, and "4 and 13" everywhere), "b2" next to "9" (now b9), and an unused function. The audit found no wrong pitches, spellings, intervals, box shapes, Drop voicings or slash names in any key.


## Current state

- **Site:** a catalog at the root, one lesson so far. Hosted on Forma by files upload (`forma redeploy`), not bound to the GitHub repository (our organization allows only `sqsp` repositories as a deploy source).
- **Steps:** 7 guided steps of 2-4 beats each, then Explore: C7 · No root · The 9 · Synonyms · Pentatonic · Mixolydian · Drop · Explore. Continue walks the beats.
- **Controls:** a legend row (legend, Intervals | Notes, octave − / +, play/stop, settings) above the board; guided steps have a Hear it button instead of the Shape bar. Explore has the Shape 1-5 bar, arrows and the five layer buttons on the card.
- **Settings:** Count from, Key, Left-handed, Sound, Neck (Scroll / Fit all), Share image.
- **Tests (all pass):** `labels2.js` (every beat of every guided step in both label modes, plus every Explore layer and shape, 0 failures), `wrap.js` (all 12 keys, 0 failures), `fit.js` (chips and shape bar fit at 320, 360, 390), `shots2.js` (no layout shift between cards 1-6, no overflow), `full.js` (the Explore neck is scrollable, centred after every arrow and Shape button, both neck modes keep the board height).


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
| **Prerequisites and "helps to know"** | Built: `helpful` list in `lesson.json` (`topic`, `why`, optional `lesson` id), shown as a "Helps to know:" line on the catalog card and a collapsed toggle under the title on step 1 (first beat only). A topic links once its lesson exists, otherwise "(coming soon)". No prerequisite lessons exist yet; the chord-synonyms lesson (Eø = Gm6, Am7 = C6) is the obvious first. |
| **The guided script** | The first draft of the sentences and beats is mine and is meant to be edited. Not yet in the script: a "where it lands" step (Bb to A, E to F), a "your turn" step, and a short "why rootless" beat about comping. |
| **Practice** | Removed until there is a plan. The guitarist review ranked three designs: (A) play over the changes: a looping backing track on a ii-V-I in F and then a 12-bar blues, the board switching to each chord's arpeggio with a target note to land on (Bb to A, E to F); build it in two steps starting with a one-chord loop; (B) a drone with a new prompt every two bars; (C) find it in 12 keys on the cycle of fourths. Recommendation: A. Needs a backing track, which needs a decision about sound design (the bass note was rejected). |
| **A "Use it" card** | Proposed, not built: when this works (a dominant going to a major chord, vamps, blues) and when it doesn't (7b9 going to a minor chord); in F, Gm6 across Gm7 and C7 and the resolutions Bb to A, E to F. Content for Jordan to approve. |
| **What to play** | Built (Jordan said yes): last beat of "Add the 9" says to play an Eø or Gm6 arpeggio over C7. Also added: "Where it lands" (two beats at the end of Mixolydian: C7 to F, Bb to A, E to F, D to C) and "Your turn" (last beat of Drop). All sentences are drafts. |
| **Explore copy** | Now the CAGED line. The review suggests a playing tip per shape (where to start, which note to land on). Not written. |
| **Settings as a sheet** | The review suggests a bottom sheet or popover instead of an inline panel that pushes the board down. Not done. |
| **Shape bar into the board** | The review suggests a one-line caption instead of the bar. Not done: Jordan asked for the Shape 1-5 control. |
| **Sound setting** | A Sound select exists (nylon, steel, jazz electric); it is a placeholder for a fuller sound section. |
| **Judgement calls from before** | Back / Continue duplicating the chips; a Key chip beside the shapes; the subtitle; spare space above short cards. Still not decided. |


## Known caveats

- **iOS share sheet untested** on a real iPhone or Android. `navigator.share({files})` is used only on touch devices; desktop downloads.
- **Sound has been checked by script, not by ear:** the samples load and decode, the notes are scheduled and stopped; how the three instruments sound is Jordan's call. iOS plays web audio only with the ringer switch on.
- **Fonts.** "Aime" and "KMR Melange Grotesk" came from the Grok host. Everywhere else they fall back to Georgia and system sans.
- **Legacy tests.** The scripts in `tests/legacy/` target the 14-step layout and need new selectors.
- **Reviews ran against moving builds:** the UI/QA report was written while the Play button and CAGED names were landing, so some of its screenshots are from the build just before.
- **Explore at the nut:** the 7th fret number is cut off at the right edge when the neck is scrolled all the way to the nut.

## Feedback round 31

- C7 step hides the 9 (not in the chord). The 3, 5 and b7 are shown as interval dots like the note dots.
- "Lose the root" is now "Rootless Chords" (chip "Rootless"); names read "C7 Rootless". Its fade-the-root beat is merged into the first beat (2 beats).
- Chord names in running text are bold. "Eø or Gm6 or a rootless C9".
- Mixolydian step assumes the scale is known (5 beats: add the 4 and 6, the 6/13 colour tone, the avoid note, where it lands x2). Hear it plays the 4 and 6 on the first beat. Mixolydian is listed in "Helps to know".
- Tutorial: `Tutorial.tsx` is a coach-mark tour (12 steps, `TUT_STEPS` in `lesson.tsx`). It opens once on a first visit (localStorage `agt-dominant-pentatonics-tutorial-seen`; never under automation), from "Show tutorial" under the title on step 1, and from Settings. "Live" steps let taps reach the lit control and keep the card off the board.
- Synonym chord names (Eø, Gm6, C9) are buttons that set Count from to that chord.
- Rule: every note name and interval in running text is a circle, roots red (`src/shared/pip.tsx`, `pipify`; what counts is `src/shared/tokens.json`; `[x]` forces a circle). `tests/circles.js` walks every beat, Helps to know and every tutorial step and fails on plain-text ones. Exempt: chord/scale names (bold, headings), the step chips, form controls such as the Key select.
- Tutorial note sits beside what it lights (only the sentence step keeps clear of the board); spotlight and note glide between steps and crossfade.
- The legend row is gone (Jordan: not useful, busy). `legendSpec` still feeds the share image. Explore's "(Eø)" and "(Gm6)" are the same count-from buttons as elsewhere. The tutorial opens the settings panel on its Settings step and waits for it to settle before moving the spotlight.

