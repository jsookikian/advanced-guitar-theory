// The heading, the beat dots and the board stay where they are as the beats change and as you move between the guided steps (text of different lengths only changes
// the space below it). Explore, with its extra controls, is the one step allowed to differ.
const { launch, open, go, stepCount, beatCount, hashFor, LESSONS, runner, all } = require('./helpers');
// Positions may differ by 1px (sub-pixel rounding of fractional line heights); anything more is a real layout shift.
const spread = set => { const v = [...set].map(Number); return Math.max(...v) - Math.min(...v); };
(async () => {
  const env = await launch(); const { F, finish } = runner('title stable');
  await all(LESSONS.flatMap(L => [390, 1000].map(W => async () => {
    {
      const pg = await open(env.b, env.site, L.id, { w: W, h: 844 });
      const steps = await stepCount(pg); const allH2 = new Set(), allBd = new Set();
      for (let c = 1; c <= steps; c++) {
        await go(pg, `#s${c}`); const n = await beatCount(pg); const h2 = new Set(), bd = new Set();
        for (let k = 0; k < n; k++) {
          await go(pg, hashFor(c, k));
          const r = await pg.evaluate((root, board) => ({ h2: Math.round(document.querySelector(root + ' h2').getBoundingClientRect().top), bd: Math.round(document.querySelector(board).getBoundingClientRect().top) }), L.root, L.board);
          h2.add(r.h2); bd.add(r.bd);
          if (c < steps) { allH2.add(r.h2); allBd.add(r.bd); }
        }
        if (spread(h2) > 1) F(`${L.id} @${W} step ${c}: the heading moves between beats: ${[...h2]}`);
        if (spread(bd) > 1) F(`${L.id} @${W} step ${c}: the board moves between beats: ${[...bd]}`);
      }
      // ...and between the guided steps (every step but Explore, which has more controls)
      if (spread(allH2) > 1) F(`${L.id} @${W}: the heading is at different heights on different steps: ${[...allH2]}`);
      if (spread(allBd) > 1) F(`${L.id} @${W}: the board is at different heights on different steps: ${[...allBd]}`);
      (pg.errors || []).forEach(e => F(`${L.id} pageerror ${e}`));
      await pg.close();
    }
  })));
  await finish(env);
})();
