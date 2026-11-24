// On a wide screen the step text starts at the left edge of the card (not centred), and the card spans the whole column, in every lesson.
const { launch, open, settle, LESSONS, runner, all } = require('./helpers');
(async () => {
  const env = await launch(); const { F, finish } = runner('desktop align');
  await all(LESSONS.map(L => async () => {
    for (const W of [700, 1000, 1400]) {
      const pg = await open(env.b, env.site, L.id, { w: W, h: 900, hash: '#s2' });
      await settle(pg);   // the card slides in from the side for 340 ms; x positions are only final after that
      const r = await pg.evaluate(sel => { const c = document.querySelector(sel), h = c.querySelector('h2'), col = c.parentElement.getBoundingClientRect(), cr = c.getBoundingClientRect(); return { cardLeft: Math.round(cr.left), cardW: Math.round(cr.width), colW: Math.round(col.width), h2: Math.round(h.getBoundingClientRect().left) }; }, L.card);
      if (r.h2 !== r.cardLeft) F(`${L.id} @${W}: heading starts at ${r.h2}, the card at ${r.cardLeft}`);
      if (Math.abs(r.cardW - r.colW) > 2) F(`${L.id} @${W}: card is ${r.cardW} wide in a ${r.colW} column`);
      (pg.errors || []).forEach(e => F(`${L.id} pageerror ${e}`));
      await pg.close();
    }
  }));
  await finish(env);
})();
