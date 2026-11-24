// Browser checks for the Sus Chords lesson (Make it / Strings / Pair / Walk / Vamp / Explore): every note and interval in the text is a circle, the page
// never changes height or overflows (320/360/390), the right dots move between beats, all 12 keys, Explore combinations.
const p = require('puppeteer-core'); const tok = require('../src/shared/tokens.json'); const { KEYS } = require('./keys.js');
(async () => {
  const site = await require('./site').start(); const b = await p.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'], headless: 'new' });
  const S = t => new Promise(r => setTimeout(r, t)); const pg = await b.newPage(); const fails = []; const F = m => { fails.push(m); if (fails.length < 40) console.log('FAIL', m); };
  pg.on('pageerror', e => F('pageerror ' + e.message)); pg.on('console', m => { if (m.type() === 'error') F('console ' + m.text()); });
  const URL = site.url('lessons/sus-chords/index.html'); const FIXED = [8, 4, 3, 0, 6, 1];
  const at = async (c, k) => { await pg.evaluate(h => { location.hash = h; }, `#s${c + 1}${k ? 'b' + (k + 1) : ''}`); await S(450); };
  const dots = () => pg.evaluate(() => [...document.querySelectorAll('#drop-board g[data-vis="1"]')].map(g => [+g.dataset.s, +g.dataset.f, g.querySelector('text').textContent]));
  const beatsIn = () => pg.evaluate(() => { const e = document.querySelector('[aria-label^="Part"]'); return e ? +e.getAttribute('aria-label').split(' of ')[1] : 1; });
  const moves = (a, b2) => a.filter((d, i) => d[0] !== b2[i][0] || d[1] !== b2[i][1]).length;
  const scan = where => pg.evaluate((src, flags, where) => {
    const re = new RegExp(src, flags), ex = '[data-pip],strong,h1,h2,#drop-name,svg,nav,select,option,label,style,script,a,button[aria-pressed],#drop-settings,[role=radiogroup],#drop-caption';
    const bad = [], w = document.createTreeWalker(document.getElementById('drop-root'), NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const t = n.nodeValue; if (!t.trim() || n.parentElement.closest(ex)) continue; const sib = n.nextSibling, prv = n.previousSibling;
      if ((sib && sib.nodeType === 1 && sib.dataset && sib.dataset.sup) || (prv && prv.nodeType === 1 && prv.dataset && prv.dataset.sup)) continue;
      for (const m of t.matchAll(re)) bad.push(where + ': "' + m[0] + '" in "' + t.trim().slice(0, 70) + '"'); }
    return bad; }, tok.source, tok.flags, where);

  for (const W of [390, 360, 320]) {
    await pg.setViewport({ width: W, height: 844 }); await pg.goto(URL); await S(900);
    const heights = new Set(), tops = new Set(); let total = 0;
    for (let c = 0; c < 6; c++) { await at(c, 0); const n = FIXED[c] || await beatsIn(); for (let k = 0; k < n; k++) {
      await at(c, k); total++; if (W === 390) (await scan(`card ${c + 1} beat ${k + 1}`)).forEach(F);
      heights.add(await pg.evaluate(() => Math.round(document.getElementById('drop-root').getBoundingClientRect().height)));
      tops.add(await pg.evaluate(() => Math.round(document.getElementById('drop-board').getBoundingClientRect().top)));
      const nd = (await dots()).length; if (nd !== 4) F(`${W}: card ${c + 1} beat ${k + 1} shows ${nd} dots`);
      if (await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) F(`${W}: card ${c + 1} beat ${k + 1} scrolls sideways`); } }
    if (heights.size !== 1) F(`${W}: page height changes between beats: ` + [...heights]); if (tops.size !== 1) F(`${W}: the board moves between beats: ` + [...tops]);
    if (W === 390 && total < 30) F('too few beats walked: ' + total);
  }

  // The right dots move. Make: each dominant 7 beat is followed by its 7sus4 with exactly one dot (the 3rd, one fret up) moved.
  await pg.setViewport({ width: 390, height: 844 }); await pg.goto(URL); await S(900);
  const seq = async (c, ks) => { const out = []; for (const k of ks) { await at(c, k); out.push(await dots()); } return out; };
  let d = await seq(0, [0, 1, 2, 3, 4, 5, 6, 7]);
  for (let i = 0; i < 8; i += 2) { if (moves(d[i], d[i + 1]) !== 1) F(`Make beat ${i + 1} to ${i + 2}: moves ${moves(d[i], d[i + 1])} dots, want 1`);
    const mv = d[i].findIndex((x, j) => x[1] !== d[i + 1][j][1]); if (mv < 0 || d[i + 1][mv][1] - d[i][mv][1] !== 1) F(`Make beat ${i + 2}: the moved dot should go up one fret`); }
  d = await seq(1, [0, 1, 2, 3]); for (const i of [0, 2]) if (moves(d[i], d[i + 1]) !== 1) F(`Strings beat ${i + 1} to ${i + 2}: moves ${moves(d[i], d[i + 1])} dots, want 1`);
  d = await seq(2, [0, 1, 2]); if (moves(d[0], d[1]) !== 2 || moves(d[1], d[2]) !== 2) F('Pair: each change moves two dots'); if (JSON.stringify(d[0]) !== JSON.stringify(d[2])) F('Pair: back to D7sus4 is not the first grip');
  d = await seq(4, [0, 1, 2, 3, 4, 5]);
  for (const [a, k2] of [[0, 1], [2, 3], [3, 4]]) if (moves(d[a], d[k2]) !== 1) F(`Vamp beat ${a + 1} to ${k2 + 1}: moves ${moves(d[a], d[k2])} dots, want 1`);
  await at(4, 4); if ((await pg.$$('.drop-halo')).length < 1) F('Vamp: the G on D7sus4 over D7 has no ring');

  // Walk: every position on every string set, two beats each, two dots move
  for (let si = 0; si < 3; si++) { await at(3, 0); await pg.evaluate(i => document.querySelectorAll('#drop-walkset button')[i].click(), si); await S(400);
    const n = await beatsIn(); if (n < 8) F(`Walk on set ${si}: only ${n} beats`);
    for (let k = 0; k < n; k += 2) { await at(3, k); const a = await dots(); await at(3, k + 1); const c2 = await dots(); if (a.length !== 4 || moves(a, c2) !== 2) F(`Walk set ${si} position ${k / 2 + 1}: ${moves(a, c2)} dots move, want 2`); } }

  // Keys: every key, a few beats, the same checks
  for (const k of KEYS) {
    await at(0, 0); await pg.evaluate(() => document.querySelector('button[aria-label="Display settings"]').click()); await S(250);
    await pg.select('#drop-key', k.id); await S(300); await pg.evaluate(() => document.querySelector('button[aria-label="Display settings"]').click()); await S(250);
    for (const [c, kk] of [[0, 0], [0, 1], [0, 7], [1, 2], [1, 3], [2, 1], [3, 1], [4, 3], [5, 0]]) { await at(c, kk); const dd = await dots(); if (dd.length !== 4) F(`${k.id} card ${c + 1}.${kk + 1} dots ${dd.length}`);
      if (dd.some(x => x[1] < 0 || x[1] > 24)) F(`${k.id} card ${c + 1}.${kk + 1} fret out of range`); (await scan(`${k.id} card ${c + 1}.${kk + 1}`)).forEach(F); }
  }

  // Explore: every string set and pair
  await pg.goto(URL); await S(700); await at(5, 0);
  for (let si = 0; si < 3; si++) for (let pr = 0; pr < 3; pr++) {
    await pg.evaluate(i => document.querySelectorAll('#drop-sets button')[i].click(), si); await pg.evaluate(i => document.querySelectorAll('#drop-pair button')[i].click(), pr); await S(250);
    const dd = await dots(); if (dd.length !== 4) F(`Explore set ${si} pair ${pr}: ${dd.length} dots`);
    await pg.evaluate(() => document.querySelectorAll('#drop-chord button')[1].click()); await S(250); const d2 = await dots(); if (moves(dd, d2) !== 2) F(`Explore set ${si} pair ${pr}: switching chord moves ${moves(dd, d2)} dots, want 2`);
  }
  console.log(fails.length ? fails.length + ' FAILED' : 'sus ok'); await b.close(); site.close(); process.exit(fails.length ? 1 : 0);
})();
