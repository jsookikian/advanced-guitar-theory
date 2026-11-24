// When a step fits in the window the page is not scrollable, and the header stays pinned at the top at every width (checked by scrolling a short window).
const { launch, open, go, stepCount, LESSONS, runner, all } = require('./helpers');
(async () => {
  const env = await launch(); const { F, finish } = runner('no scroll');
  const SIZES = [[390, 844], [430, 932], [1000, 900], [1280, 800]]; const lines = [];
  await all(LESSONS.flatMap(L => [...SIZES.map(([W, H]) => async () => {
    {
      const pg = await open(env.b, env.site, L.id, { w: W, h: H });
      const steps = await stepCount(pg); const over = [];
      for (let c = 1; c <= steps; c++) {
        await go(pg, `#s${c}`);
        const r = await pg.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: innerHeight }));
        if (r.sh > r.ih + 1) over.push(`step ${c} (${r.sh} > ${r.ih})`);
      }
      lines.push(`${L.id} @${W}x${H}: ${over.length ? 'scrolls on ' + over.join(', ') : 'never scrolls'}`);
      if (over.length) F(`${L.id} @${W}x${H}: page scrolls although it should fit: ${over.join(', ')}`);
      await pg.close();
    }
  }), ...[390, 1000].map(W => async () => {
    // the header stays pinned when the page is scrolled, at phone and desktop widths
    {
      const pg = await open(env.b, env.site, L.id, { w: W, h: 420, hash: '#s2' });
      await pg.evaluate(() => scrollTo(0, 120)); await pg.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      const r = await pg.evaluate(() => { const h = document.querySelector('.agt-sticky'); return { y: scrollY, top: Math.round(h.getBoundingClientRect().top), pos: getComputedStyle(h).position }; });
      if (r.pos !== 'sticky' || r.top !== 0) F(`${L.id} @${W}: header not pinned (position ${r.pos}, top ${r.top} after scrolling ${r.y})`);
      if (r.y < 50) F(`${L.id} @${W}: the short window did not scroll at all, so the pinned check proves nothing`);
      await pg.close();
    }
  })]));
  lines.sort().forEach(l => console.log(l));
  await finish(env);
})();
