// Browser checks for the Sus Chords lesson (Make it / Strings / Pair / Walk / Vamp / Roots / Explore): every note and interval in the text is a circle, the
// page holds still within a step and never overflows (320/360/390), the right dots move between beats, all 12 keys, Explore combinations, string-set switching.
// The sections run side by side on separate pages of one browser.
const tok = require('../src/shared/tokens.json'); const { KEYS } = require('./keys.js');
const { launch, open, go, frames, beatCount, hashFor, runner, all } = require('./helpers');
(async () => {
  const env = await launch(); const { F, finish } = runner('sus');
  const LESSON = 'sus-chords'; const FIXED = [8, 4, 3, 0, 6, 5, 1];
  const page = async (w = 390) => {
    const pg = await open(env.b, env.site, LESSON, { w, h: 844 });
    pg.on('console', m => { if (m.type() === 'error') F('console ' + m.text()); });
    return pg;
  };
  const at = (pg, c, k) => go(pg, hashFor(c + 1, k));
  const dots = pg => pg.evaluate(() => [...document.querySelectorAll('#drop-board g[data-vis="1"]')].map(g => [+g.dataset.s, +g.dataset.f, g.querySelector('text').textContent]));
  const moves = (a, b2) => a.filter((d, i) => d[0] !== b2[i][0] || d[1] !== b2[i][1]).length;
  const click = async (pg, sel, i) => { await pg.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await frames(pg); };
  const scan = (pg, where) => pg.evaluate((src, flags, where) => {
    const re = new RegExp(src, flags), ex = '[data-pip],strong,h1,h2,#drop-name,svg,nav,select,option,label,style,script,a,button[aria-pressed],#drop-settings,[role=radiogroup],#drop-caption';
    const bad = [], w = document.createTreeWalker(document.getElementById('drop-root'), NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const t = n.nodeValue; if (!t.trim() || n.parentElement.closest(ex)) continue; const sib = n.nextSibling, prv = n.previousSibling;
      if ((sib && sib.nodeType === 1 && sib.dataset && sib.dataset.sup) || (prv && prv.nodeType === 1 && prv.dataset && prv.dataset.sup)) continue;
      for (const m of t.matchAll(re)) bad.push(where + ': "' + m[0] + '" in "' + t.trim().slice(0, 70) + '"'); }
    return bad; }, tok.source, tok.flags, where);

  // 1. every beat at three widths: circles (at 390), four dots, no sideways scroll, nothing moves within a step
  const widths = W => async () => {
    const pg = await page(W); let total = 0;
    for (let c = 0; c < 7; c++) {
      const heights = new Set(), tops = new Set(); await at(pg, c, 0); const n = FIXED[c] || await beatCount(pg);
      for (let k = 0; k < n; k++) {
        await at(pg, c, k); total++; if (W === 390) (await scan(pg, `card ${c + 1} beat ${k + 1}`)).forEach(F);
        const m = await pg.evaluate(() => ({ h: Math.round(document.getElementById('drop-root').getBoundingClientRect().height), t: Math.round(document.getElementById('drop-board').getBoundingClientRect().top), sx: document.documentElement.scrollWidth > innerWidth + 1 }));
        heights.add(m.h); tops.add(m.t);
        const nd = (await dots(pg)).length; if (nd !== 4) F(`${W}: card ${c + 1} beat ${k + 1} shows ${nd} dots`);
        if (m.sx) F(`${W}: card ${c + 1} beat ${k + 1} scrolls sideways`);
      }
      if (heights.size !== 1) F(`${W}: card ${c + 1}: page height changes between its beats: ` + [...heights]);
      if (tops.size !== 1) F(`${W}: card ${c + 1}: the board moves between its beats: ` + [...tops]);
    }
    if (W === 390 && total < 30) F('too few beats walked: ' + total);
    await pg.close();
  };

  // 2. the right dots move
  const moving = async () => {
    const pg = await page();
    const seq = async (c, ks) => { const out = []; for (const k of ks) { await at(pg, c, k); out.push(await dots(pg)); } return out; };
    // Make: each dominant 7 beat is followed by its 7sus4 with exactly one dot (the 3rd, one fret up) moved.
    let d = await seq(0, [0, 1, 2, 3, 4, 5, 6, 7]);
    for (let i = 0; i < 8; i += 2) { if (moves(d[i], d[i + 1]) !== 1) F(`Make beat ${i + 1} to ${i + 2}: moves ${moves(d[i], d[i + 1])} dots, want 1`);
      const mv = d[i].findIndex((x, j) => x[1] !== d[i + 1][j][1]); if (mv < 0 || d[i + 1][mv][1] - d[i][mv][1] !== 1) F(`Make beat ${i + 2}: the moved dot should go up one fret`); }
    d = await seq(1, [0, 1, 2, 3]); for (const i of [0, 2]) if (moves(d[i], d[i + 1]) !== 1) F(`Strings beat ${i + 1} to ${i + 2}: moves ${moves(d[i], d[i + 1])} dots, want 1`);
    d = await seq(2, [0, 1, 2]); if (moves(d[0], d[1]) !== 2 || moves(d[1], d[2]) !== 2) F('Pair: each change moves two dots'); if (JSON.stringify(d[0]) !== JSON.stringify(d[2])) F('Pair: back to D7sus4 is not the first grip');
    d = await seq(4, [0, 1, 2, 3, 4, 5]);
    for (const [a, k2] of [[0, 1], [2, 3], [3, 4]]) if (moves(d[a], d[k2]) !== 1) F(`Vamp beat ${a + 1} to ${k2 + 1}: moves ${moves(d[a], d[k2])} dots, want 1`);
    await at(pg, 4, 4); if ((await pg.$$('.drop-halo')).length < 1) F('Vamp: the G on D7sus4 over D7 has no ring');
    // Roots: B and E, each minor 7 then its 7sus4 with the b3 two frets up to the 4
    d = await seq(5, [0, 1, 2, 3, 4]);
    for (const i of [0, 2]) {
      if (moves(d[i], d[i + 1]) !== 1) F(`Roots beat ${i + 1} to ${i + 2}: moves ${moves(d[i], d[i + 1])} dots, want 1`);
      const mv = d[i].findIndex((x, j) => x[1] !== d[i + 1][j][1]); if (mv < 0 || d[i + 1][mv][1] - d[i][mv][1] !== 2) F(`Roots beat ${i + 2}: the moved dot should go up two frets`);
    }
    if (moves(d[3], d[4]) !== 0) F('Roots: the summary beat should not move a dot');
    await pg.close();
  };

  // 3. Walk: every position on every string set, two beats each, two dots move
  const walking = async () => {
    const pg = await page();
    for (let si = 0; si < 3; si++) {
      await at(pg, 3, 0); await click(pg, '#drop-walkset button', si);
      const n = await beatCount(pg); if (n < 8) F(`Walk on set ${si}: only ${n} beats`);
      for (let k = 0; k < n; k += 2) { await at(pg, 3, k); const a = await dots(pg); await at(pg, 3, k + 1); const c2 = await dots(pg); if (a.length !== 4 || moves(a, c2) !== 2) F(`Walk set ${si} position ${k / 2 + 1}: ${moves(a, c2)} dots move, want 2`); }
    }
    await pg.close();
  };

  // 4. Keys: every key, a few beats, the same checks (three keys per page)
  const keyed = ks => async () => {
    const pg = await page();
    for (const k of ks) {
      await pg.select('#drop-key', k.id); await frames(pg);
      for (const [c, kk] of [[0, 0], [0, 1], [0, 7], [1, 2], [1, 3], [2, 1], [3, 1], [4, 3], [5, 1], [5, 3], [6, 0]]) {
        await at(pg, c, kk); const dd = await dots(pg); if (dd.length !== 4) F(`${k.id} card ${c + 1}.${kk + 1} dots ${dd.length}`);
        if (dd.some(x => x[1] < 0 || x[1] > 24)) F(`${k.id} card ${c + 1}.${kk + 1} fret out of range`); (await scan(pg, `${k.id} card ${c + 1}.${kk + 1}`)).forEach(F);
      }
    }
    await pg.close();
  };

  // 5. Explore: every string set and pair, and switching string sets keeps the voicing (same chord name, so the same inversion)
  const exploring = async () => {
    const pg = await page(); await at(pg, 6, 0);
    if (!(await pg.$('#drop-hear'))) F('Explore has no Hear it button');
    for (let si = 0; si < 3; si++) for (let pr = 0; pr < 3; pr++) {
      await click(pg, '#drop-sets button', si); await click(pg, '#drop-pair button', pr);
      const dd = await dots(pg); if (dd.length !== 4) F(`Explore set ${si} pair ${pr}: ${dd.length} dots`);
      await click(pg, '#drop-chord button', 1); const d2 = await dots(pg); if (moves(dd, d2) !== 2) F(`Explore set ${si} pair ${pr}: switching chord moves ${moves(dd, d2)} dots, want 2`);
    }
    await pg.close();
  };
  const switching = async () => {
    const pg = await page(); const nm = () => pg.$eval('#drop-name-title', e => e.textContent);
    await at(pg, 6, 0); await click(pg, '#drop-sets button', 2);
    for (let step = 0; step < 4; step++) {
      const before = await nm();
      for (const si of [1, 0, 1, 2]) { await click(pg, '#drop-sets button', si); const a = await nm(); if (a !== before) F(`Explore: moving to set ${si} changed ${before} to ${a}`); }
      await pg.evaluate(() => document.querySelector('button[aria-label^="Next position"]').click()); await frames(pg);
    }
    await at(pg, 3, 0); await click(pg, '#drop-walkset button', 2);
    for (const k of [2, 4]) { await at(pg, 3, k); const before = await nm(); for (const si of [1, 0, 2]) { await click(pg, '#drop-walkset button', si); const a = await nm(); if (a !== before) F(`Walk: moving to set ${si} changed ${before} to ${a}`); } }
    await pg.close();
  };

  await all([widths(390), widths(360), widths(320), moving, walking, keyed(KEYS.slice(0, 3)), keyed(KEYS.slice(3, 6)), keyed(KEYS.slice(6, 9)), keyed(KEYS.slice(9)), exploring, switching]);
  await finish(env);
})();
