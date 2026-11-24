// The tutorial on a short phone screen, in every lesson: it walks to the end without errors, and each lit control ends up between the pinned header
// and the fixed bottom bar (never under them). The lit box is the dialog's aria-hidden child with a box-shadow (the spotlight the tutorial draws).
const { launch, open, LESSONS, runner, all } = require('./helpers');
(async () => {
  const env = await launch(); const { F, finish } = runner('pinned tutorial');
  const lines = [];
  await all(LESSONS.map(L => async () => {
    const pg = await open(env.b, env.site, L.id, { w: 390, h: 560 });
    await pg.evaluate(id => document.getElementById(id).click(), L.tutorial);
    // Wait (in the page) until the lit box has stopped moving for a few frames, then report where it is and what the note says.
    const lookAtStep = () => pg.evaluate(() => new Promise(resolve => {
      const dlg = () => document.querySelector('[role=dialog][aria-label=Tutorial]');
      const lit = d => d.querySelector(':scope > div[aria-hidden][style*="box-shadow"]');
      const hd = document.querySelector('.agt-sticky'), bar = document.querySelector('.agt-bottombar');
      let last = '', same = 0, frames = 0;
      const tick = () => {
        const d = dlg(); if (!d) return resolve(null);
        const el = lit(d), rc = el ? el.getBoundingClientRect() : null, key = rc ? [rc.top, rc.bottom, rc.left].map(Math.round).join() : 'none';
        same = key === last ? same + 1 : 0; last = key; frames++;
        if ((rc && same >= 4) || frames > 60) return resolve({ t: rc ? Math.round(rc.top) : null, b: rc ? Math.round(rc.bottom) : null, top: hd ? hd.getBoundingClientRect().bottom : 0, bottom: bar ? bar.getBoundingClientRect().top : innerHeight, sig: d.innerText });
        requestAnimationFrame(tick);
      };
      tick();
    }));
    let n = 0;
    for (; n < 40; n++) {
      const r = await lookAtStep(); if (!r) break;
      if (r.t !== null && !(r.t >= r.top - 2 || r.b <= r.top + 2)) F(`${L.id} step ${n + 1}: lit box ${r.t}-${r.b} sits under the header (${r.top})`);
      if (r.t !== null && r.t < r.bottom - 12 && r.b > r.bottom + 40) F(`${L.id} step ${n + 1}: lit box ${r.t}-${r.b} sits under the bottom bar (${r.bottom})`);
      await pg.keyboard.press('ArrowRight');
      await pg.waitForFunction(sig => { const d = document.querySelector('[role=dialog][aria-label=Tutorial]'); return !d || d.innerText !== sig; }, { timeout: 4000 }, r.sig).catch(() => {});
    }
    if (n < 8 || n >= 40) F(`${L.id}: tutorial ran ${n} steps`);
    lines.push(`${L.id} steps ${n}`);
    (pg.errors || []).forEach(e => F(`${L.id} pageerror ${e}`));
    await pg.close();
  }));
  lines.sort().forEach(l => console.log(l));
  await finish(env);
})();
