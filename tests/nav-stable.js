// Where Back / Continue and Hear it sit as you move through a lesson: reports the spread within each step and across the whole lesson, at phone and desktop widths.
// With ALL=1 it fails when the nav moves at all; by default it fails only when it moves between the beats of one step.
const { launch, open, go, stepCount, beatCount, hashFor, LESSONS, runner, all } = require('./helpers');
// Positions may differ by 1px (sub-pixel rounding of fractional line heights); anything more is a real layout shift.
const spread = set => { const v = [...set].map(Number); return Math.max(...v) - Math.min(...v); };
const spreadPairs = set => { const rows = [...set].map(x => String(x).split('/').map(Number)); return Math.max(0, ...rows.map(r => Math.max(...r.map((v, i) => Math.abs(v - rows[0][i]))))); };
(async () => {
  const env = await launch(); const { F, finish } = runner('nav stable');
  const lines = [];
  await all(LESSONS.flatMap(L => [390, 600, 700, 1000].map(W => async () => {
    {
      const pg = await open(env.b, env.site, L.id, { w: W, h: 844 });
      const steps = await stepCount(pg); const tops = new Set();
      for (let c = 1; c <= steps; c++) {
        await go(pg, `#s${c}`); const n = (W === 600 || W === 700) ? 1 : await beatCount(pg); const inStep = new Set();   // 600 and 700 only check the first beat of each step (the bar is the same element at every beat; 390 and 1000 walk them all)
        for (let k = 0; k < n; k++) {
          await go(pg, hashFor(c, k));
          const t = await pg.evaluate((nav, hear) => { const a = document.querySelector(nav).getBoundingClientRect().top, h = document.querySelector(hear); return Math.round(a) + '/' + (h ? Math.round(h.getBoundingClientRect().top) : '-'); }, L.nav, L.hear);
          inStep.add(t); tops.add(t.split('/')[0]);
        }
        if (spreadPairs(inStep) > 1) F(`${L.id} @${W} step ${c}: nav/Hear it move between beats: ${[...inStep].join(' ')}`);
      }
      if (process.env.ALL && spread(tops) > 1) F(`${L.id} @${W}: nav top varies across the lesson: ${[...tops].join(', ')}`);
      lines.push(`${L.id} @${W}: nav top ${[...tops].join(', ')}`);
      (pg.errors || []).forEach(e => F(`${L.id} pageerror ${e}`));
      await pg.close();
    }
  })));
  lines.sort().forEach(l => console.log(l));
  await finish(env);
})();
