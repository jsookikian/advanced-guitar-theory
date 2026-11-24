// On a wide screen the step text starts at the left edge of the card (not centred), and the card spans the whole column, in every lesson.
const p = require('puppeteer-core');
(async () => {
  const site = await require('./site').start(); const b = await p.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'], headless: 'new' });
  const S = t => new Promise(r => setTimeout(r, t)); const fails = []; const F = m => { fails.push(m); console.log('FAIL', m); };
  for (const [lesson, card] of [['dominant-pentatonics', '.nine-card'], ['drop-2-chords', '.drop-card'], ['drop-3-chords', '.drop-card'], ['sus-chords', '.drop-card']]) {
    const pg = await b.newPage(); pg.on('pageerror', e => F(lesson + ' pageerror ' + e.message));
    for (const W of [700, 1000, 1400]) {
      await pg.setViewport({ width: W, height: 900 }); await pg.goto(site.url(`lessons/${lesson}/index.html#s2`)); await S(900);
      const r = await pg.evaluate(sel => { const c = document.querySelector(sel), h = c.querySelector('h2'), col = c.parentElement.getBoundingClientRect(); const cr = c.getBoundingClientRect(); return { cardLeft: Math.round(cr.left), cardW: Math.round(cr.width), colW: Math.round(col.width), h2: Math.round(h.getBoundingClientRect().left), board: Math.round(document.querySelector('svg').getBoundingClientRect().left) }; }, card);
      if (r.h2 !== r.cardLeft) F(`${lesson} @${W}: heading starts at ${r.h2}, the card at ${r.cardLeft}`);
      if (Math.abs(r.cardW - r.colW) > 2) F(`${lesson} @${W}: card is ${r.cardW} wide in a ${r.colW} column`);
    }
    await pg.close();
  }
  console.log(fails.length ? fails.length + ' FAILED' : 'desktop align ok'); await b.close(); site.close(); process.exit(fails.length ? 1 : 0);
})();
