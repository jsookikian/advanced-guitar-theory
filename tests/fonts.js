// The chord symbols (triangle, circle, half-diminished) are Private Use codepoints from MuseJazz Text. This fails if any symbol the site
// can produce is missing from the shipped font's cmap, or if a rendered symbol is drawn in another font (tofu or fallback).
const fs = require('fs'), path = require('path'), p = require('puppeteer-core'); const N = require('./notation');
const FONT = path.resolve(__dirname, '../fonts/MuseJazzText.otf');
function cmap(file) { // format 4 (BMP) subtables
  const d = fs.readFileSync(file), n = d.readUInt16BE(4), tabs = {};
  for (let i = 0; i < n; i++) tabs[d.toString('latin1', 12 + 16 * i, 16 + 16 * i)] = d.readUInt32BE(20 + 16 * i);
  const o = tabs.cmap, nt = d.readUInt16BE(o + 2), set = new Set();
  for (let i = 0; i < nt; i++) { const s = o + d.readUInt32BE(o + 8 + 8 * i); if (d.readUInt16BE(s) !== 4) continue; const sc = d.readUInt16BE(s + 6) / 2;
    for (let k = 0; k < sc; k++) { const end = d.readUInt16BE(s + 14 + 2 * k), start = d.readUInt16BE(s + 16 + 2 * sc + 2 * k); for (let c = start; c <= Math.min(end, 0xfffe); c++) set.add(c); } }
  return set;
}
(async () => {
  const fails = []; const F = m => fails.push(m); const cm = cmap(FONT);
  // every character the symbols style can produce that is not plain ASCII or a flat/sharp must be in the font
  const kinds = ['maj7', 'dom7', 'm7', 'hdim', 'dim7', 'm6', 'six', 'dom9', 'min'], used = new Set();
  for (const k of kinds) for (const ch of N.chordSymbol('C', k, 'G♭', 'symbols')) used.add(ch.codePointAt(0));
  used.forEach(c => { if (!cm.has(c)) F('codepoint U+' + c.toString(16).toUpperCase() + ' is not in MuseJazzText.otf'); });
  const site = await require('./site').start();
  const b = await p.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  const pg = await b.newPage(); await pg.setViewport({ width: 390, height: 844 });
  for (const page of ['drop-2-chords', 'dominant-pentatonics']) {
    await pg.goto(site.url(`lessons/${page}/index.html`)); await new Promise(r => setTimeout(r, 900));
    const nav = page === 'drop-2-chords' ? 6 : 7;
    await pg.evaluate(c => document.querySelectorAll('nav[aria-label="Lesson steps"] button')[c].click(), nav); await new Promise(r => setTimeout(r, 700));
    if (page !== 'drop-2-chords') { await pg.evaluate(() => [...document.querySelectorAll('.nine-card button')].find(b => b.textContent === 'Arpeggio').click()); await new Promise(r => setTimeout(r, 300)); }
    const tabsSel = page === 'drop-2-chords' ? '#drop-quality button' : '#nine-from button';
    for (let i = 0; i < (page === 'drop-2-chords' ? 7 : 3); i++) { await pg.evaluate((s, i) => document.querySelectorAll(s)[i].click(), tabsSel, i); await new Promise(r => setTimeout(r, 250)); }
    await pg.evaluate(() => document.fonts.ready);
    const r = await pg.evaluate(() => {
      const out = []; const syms = /[]/;
      const probe = (ch, fam) => { const s = document.createElement('span'); s.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:400 40px ${fam}`; s.textContent = ch; document.body.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return w; };
      document.querySelectorAll('[data-muse]').forEach(el => {
        const ch = [...el.textContent].find(c => syms.test(c)); const ff = getComputedStyle(el).fontFamily;
        if (!ch) { out.push({ ch: '', ff, checked: true, w: 99, wNone: 0, plainPiece: el.textContent }); return; }
        out.push({ ch: ch.codePointAt(0).toString(16), ff, checked: document.fonts.check("40px 'MuseJazz Text'", ch), w: probe(ch, "'MuseJazz Text'"), wFallback: probe(ch, 'serif'), wNone: probe('', "'MuseJazz Text'") });
      });
      return { out, plain: [...document.querySelectorAll('#drop-root, #nine-root')].map(r => [...r.querySelectorAll('*')].filter(e => e.children.length === 0 && /[]/.test(e.textContent) && !e.closest('[data-muse]') && !e.closest('svg')).map(e => e.tagName + ':' + e.textContent)).flat(), loaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family) };
    });
    if (!r.out.length) F(page + ': no chord symbols found on the screen to check');
    r.out.forEach(o => { if (!o.ch) { if (!/MuseJazz Text/.test(o.ff)) F(`${page} quality mark '${o.plainPiece}' drawn in ${o.ff}`); return; } if (!/MuseJazz Text/.test(o.ff)) F(`${page} U+${o.ch} drawn in ${o.ff}`); if (!o.checked) F(`${page} U+${o.ch}: document.fonts.check false`); if (o.w < 4) F(`${page} U+${o.ch}: zero width`); if (Math.abs(o.w - o.wNone) < 0.01) F(`${page} U+${o.ch} measures like a missing glyph (${o.w})`); });
    r.plain.forEach(x => F(`${page}: symbol outside a MuseJazz span: ${x}`));
    if (!r.loaded.some(f => /MuseJazz Text/.test(f))) F(page + ': MuseJazz Text was not loaded');
    console.log(page, 'quality marks checked:', r.out.length, 'glyphs:', [...new Set(r.out.filter(o => o.ch).map(o => 'U+' + o.ch.toUpperCase()))].join(' '));
  }
  console.log(fails.length ? fails.join('\n') : 'ok'); console.log('fails', fails.length);
  await b.close(); site.close(); process.exit(fails.length ? 1 : 0);
})();
