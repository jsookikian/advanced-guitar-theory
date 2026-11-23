// Makes the 1200x630 link-preview cards: share.png at the repo root (the catalog) and lessons/<id>/share.png for every lesson.
// The cards are drawn by src/cards/card.tsx with the lessons' own Board and chord-name code, in headless Chrome, so they cannot drift from the site.
// Run from tests/:  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node make-share-cards.js
// Each lesson says what its card shows in lessons/<id>/lesson.json ("card": title, subtitle, and the chord: drop, set, inv, or rootless).
const esbuild = require('esbuild'), path = require('path'), fs = require('fs'), p = require('puppeteer-core');
const root = path.resolve(__dirname, '..');
(async () => {
  const bundle = esbuild.buildSync({ entryPoints: [path.join(root, 'src/cards/card.tsx')], bundle: true, write: false, format: 'iife', minify: true, jsx: 'automatic', alias: { 'grok/canvas': path.join(root, 'src/shared/grok-canvas-shim.ts') }, define: { 'process.env.NODE_ENV': '"production"' } }).outputFiles[0].text;
  const specs = [{ file: 'share.png', spec: { kind: 'catalog', title: 'Advanced Guitar Theory', subtitle: 'Short, interactive fretboard lessons for players who already know their pentatonics.', chord: { drop: 'drop2', set: 1, inv: 2 } } }];
  for (const id of fs.readdirSync(path.join(root, 'lessons'))) { const f = path.join(root, 'lessons', id, 'lesson.json'); if (!fs.existsSync(f)) continue; const c = JSON.parse(fs.readFileSync(f, 'utf8')).card; if (!c) { console.log('no card in', id); continue; }
    specs.push({ file: `lessons/${id}/share.png`, spec: { kind: 'lesson', title: c.title, subtitle: c.subtitle, chord: { drop: c.drop, set: c.set, inv: c.inv, rootless: c.rootless } } }); }
  const site = await require('./site').start();
  const b = await p.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'], headless: 'new' });
  const pg = await b.newPage(); pg.on('pageerror', e => console.log('ERR', e.message)); await pg.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  for (const { file, spec } of specs) {
    await pg.goto(site.url('index.html'));
    await pg.evaluate(() => { document.body.innerHTML = '<div id="root"></div>'; document.body.style.cssText = 'margin:0;background:#fdfcfb'; const st = document.createElement('style'); st.textContent = "@font-face{font-family:'MuseJazz Text';src:url('/fonts/MuseJazzText.otf') format('opentype');font-display:block}@font-face{font-family:'MuseJazz Text';src:url('/fonts/MuseJazz.otf') format('opentype');unicode-range:U+266D,U+266F;font-display:block}"; document.head.appendChild(st); });
    await pg.addScriptTag({ content: bundle });
    await pg.evaluate(s => window.renderCard(s), spec);
    await pg.waitForSelector('#card');
    await pg.evaluate(async () => { await document.fonts.load("84px 'MuseJazz Text'", 'C7-/♭♯9'); await document.fonts.ready; });
    await new Promise(r => setTimeout(r, 500));
    const out = path.join(root, file); await pg.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log(file, fs.statSync(out).size, 'bytes');
  }
  await b.close(); site.close();
})();
