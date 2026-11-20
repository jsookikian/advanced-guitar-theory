# Advanced Guitar Theory

A lesson-style site of short, interactive fretboard lessons for advancing guitarists. Lesson 1 is **Dominant Pentatonics and Half Diminished Chords** (the "9 approach"): over a dominant chord, drop the root and add the 9 and you get C9 without the root, Eø and Gm6, which are one shape with three names.

## Shape

- A Managed (static) web app space. The platform serves the repo flat by path.
- `index.html` at the root is the catalog; each lesson lives at `lessons/<id>/index.html` with its own `app.js`.
- `npm run build` (`build.mjs`) generates the catalog and every lesson's `index.html` and `app.js` from `src/lessons/<id>/` and `lessons/<id>/lesson.json`. The generated files are committed, because nothing builds on the server.
- No database, no functions, no variables. Everything is computed in the browser.
- Sound: recorded guitar samples in `sounds/` (FluidR3 GM, CC BY 3.0, credited on the catalog page), loaded on the first tap by `src/shared/audio.ts`.
- The look is the site's own (a white paper sheet, locked against forced dark modes by `lockPaint()` in lesson 1), not Pristine.
- Deploys are by files upload (`forma redeploy`), not bound to the GitHub repo, because the organization allows only `sqsp` repositories as a deploy source.

## Adding a lesson

See the root `README.md`: a `src/lessons/<id>/main.tsx`, a `lessons/<id>/lesson.json`, then `npm run build`.

## Other files

The platform serves every file by path, so the lesson docs, `tests/`, `renders/` and `source-material/` are reachable too; none of them is linked from the site.
