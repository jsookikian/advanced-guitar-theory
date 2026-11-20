# Advanced Guitar Theory

An interactive fretboard lesson site. Its first lesson is **Dominant Pentatonics and Half Diminished Chords** (the "9 approach"): over a dominant chord, drop the root and add the 9 and you get C9 without the root, Eø and Gm6, which are one shape with three names.

## Shape

- A Managed (static) web app space. The platform serves the repo flat by path and answers the root with `index.html`.
- `index.html` and the built `app.js` at the root are the served app. `app.js` is committed build output: run `npm run build` after any change to `src/` and commit both.
- `src/lesson.tsx` is the whole lesson (one React file); `src/main.tsx` mounts it; `src/grok-canvas-shim.ts` stands in for the original canvas host module `grok/canvas`.
- No database, no functions, no variables. Everything is computed in the browser from the chosen key.
- The look is the lesson's own (a white paper sheet, locked against forced dark modes by `lockPaint()`), not Pristine.

## Other files

The platform serves every file by path, so these are reachable too; none of them is linked from the app.

`README.md` and `CONTEXT.md` carry the lesson's theory and architecture. `tests/` holds puppeteer checks against `index.html`. `renders/` and `source-material/` are reference images from the build, kept for history.
