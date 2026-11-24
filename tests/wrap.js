// Dominant Pentatonics, Explore: the five shapes lay out up the whole neck in every key, in order, with the right dots, the arrows stop at both ends, and tapping the
// selected Shape button steps it up an octave (remounting the board). Keys are spread over four pages that run side by side; KEYS=C,G limits the keys.
const { launch, open, frames, runner, all } = require('./helpers');
(async () => {
  const env = await launch(); const { F, finish } = runner('wrap');
  const KEYS = (process.env.KEYS || 'C,Db,D,Eb,E,F,F#,G,Ab,A,Bb,B').split(','); const summary = {};
  const PAGES = Math.min(4, KEYS.length);

  const worker = idx => async () => {
    // a phone-sized dark-scheme page (the lesson must stay light), on the Explore step with Settings open
    const pg = await open(env.b, env.site, 'dominant-pentatonics', { w: 390, h: 844, mobile: true });
    await pg.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await pg.evaluate(() => [...document.querySelectorAll('nav[aria-label="Lesson steps"] button')][7].click()); await frames(pg);
    await pg.click('.nine-icon[aria-label="Display settings"]'); await frames(pg);
    const st = () => pg.evaluate(() => {
      const sp = document.getElementById('nine-shape'); const m = [0, +sp.dataset.p, +sp.dataset.lo, +sp.dataset.hi];
      const svg = document.getElementById('nine-board'); const wl = +svg.getAttribute('aria-label').match(/\d+/)[0];
      const vis = [...svg.querySelectorAll('g[data-vis="1"]')].map(g => +g.dataset.f);
      if (!svg.__id) svg.__id = Math.random();
      return { p: m[1], lo: m[2], hi: m[3], wl, vmin: Math.min(...vis), vmax: Math.max(...vis), nv: vis.length, sid: svg.__id, txt: 'Shape ' + m[1] + ' ' + sp.textContent };
    });
    const dis = sel => pg.evaluate(q => document.querySelector(q).disabled, sel);
    const clickAndSettle = async fn => { await fn(); await frames(pg); };
    const shapeBtn = n => pg.evaluate(n => [...document.querySelectorAll('[aria-label="Shape"] [role=radio]')][n - 1].click(), n);

    for (let ki = idx; ki < KEYS.length; ki += PAGES) {
      const key = KEYS[ki];
      const ok = await pg.evaluate(k => { const s = document.querySelector('select'); return !![...s.options].find(o => o.value === k); }, key); if (!ok) { F('no key ' + key); continue; }
      await pg.select('select', key); await frames(pg);
      // The arrows stop at the ends: walk down to the lowest copy (Prev disabled there), then up to the highest (Next disabled there).
      for (let g = 0; g < 20 && !(await dis('.nine-arrow[aria-label^="Prev"]')); g++) await clickAndSettle(() => pg.click('.nine-arrow[aria-label^="Prev"]'));
      if (!(await dis('.nine-arrow[aria-label^="Prev"]'))) F(key + ' Prev never disabled at the nut');
      const list = []; let s = await st();
      for (let i = 0; i < 20; i++) {
        list.push(s); if (await dis('.nine-arrow[aria-label^="Next"]')) break;
        await clickAndSettle(() => pg.click('.nine-arrow[aria-label^="Next"]')); const n = await st();
        if (n.lo < s.lo) F(key + ' stepped backwards ' + n.txt);
        if (n.sid !== s.sid) F(key + ' remount on normal step');
        s = n;
      }
      if (!(await dis('.nine-arrow[aria-label^="Next"]'))) F(key + ' Next never disabled at the top');
      // Octave: tapping the selected Shape button moves the same shape up 12 frets, and from the highest copy back to the lowest, with a remount.
      for (let sh = 1; sh <= 5; sh++) {
        const L = list.filter(q => q.p === sh); if (L.length < 2) continue;
        await clickAndSettle(() => shapeBtn(sh)); let c = await st();
        // go to this shape's lowest copy first
        for (let g = 0; g < 4 && c.lo !== L[0].lo; g++) { await clickAndSettle(() => pg.evaluate(() => document.querySelector('#nine-shape [aria-checked=true]').click())); c = await st(); }
        for (let i = 1; i <= L.length; i++) {
          const before = c;
          await clickAndSettle(() => shapeBtn(sh)); c = await st();
          const want = L[i % L.length];
          if (c.p !== sh || c.lo !== want.lo) F(key + ' tap shape ' + sh + ' step ' + i + ' went to ' + c.txt + ' wanted ' + want.lo);
          if (c.sid === before.sid) F(key + ' tap no remount');
        }
      }
      await clickAndSettle(() => shapeBtn(1));
      // checks
      list.forEach((q, i) => {
        if (q.lo < 0 || q.hi > 24) F(key + ' range ' + q.txt); if (i && q.lo < list[i - 1].lo) F(key + ' order');
        if (q.vmin < q.lo || q.vmax > q.hi) F(key + ' dots outside ' + q.txt + ' ' + q.vmin + '-' + q.vmax);
        if (q.vmin < q.wl || q.vmax > q.wl + 6) F(key + ' dots off window ' + q.txt + ' wl' + q.wl);
        if (q.nv < 6) F(key + ' few dots ' + q.txt);
      });
      for (let sh = 1; sh <= 5; sh++) {
        const L = list.filter(q => q.p === sh); if (!L.length) { F(key + ' missing shape ' + sh); continue; }
        for (let i = 1; i < L.length; i++) if (L[i].lo - L[i - 1].lo !== 12) F(key + ' shape ' + sh + ' gap');
        if (L[0].lo - 12 >= 0) F(key + ' shape ' + sh + ' missing lower'); if (L[L.length - 1].hi + 12 <= 24) F(key + ' shape ' + sh + ' missing higher');
      }
      summary[key] = key + ': ' + list.length + ' [' + list.map(q => q.p + '@' + q.lo + '-' + q.hi).join(' ') + ']';
    }
    (pg.errors || []).forEach(e => F('pageerror ' + e));
    await pg.close();
  };

  await all(Array.from({ length: PAGES }, (_, i) => worker(i)));
  console.log(KEYS.map(k => summary[k]).filter(Boolean).join('\n'));
  await finish(env);
})();
