// Within one step the heading, the beat dots and the board stay where they are as the beats change (text of different lengths only changes the space below it).
const p = require('puppeteer-core');
(async () => {
  const site = await require('./site').start(); const b = await p.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'], headless: 'new' });
  const S = t => new Promise(r => setTimeout(r, t)); const fails = []; const F = m => { fails.push(m); console.log('FAIL', m); };
  for (const [lesson, root, board] of [['dominant-pentatonics', '#nine-root', '#nine-board'], ['drop-2-chords', '#drop-root', '#drop-board'], ['drop-3-chords', '#drop-root', '#drop-board'], ['sus-chords', '#drop-root', '#drop-board']]) {
    const pg = await b.newPage(); pg.on('pageerror', e => F(lesson + ' pageerror ' + e.message));
    for (const W of [390, 1000]) {
      await pg.setViewport({ width: W, height: 844 }); await pg.goto(site.url(`lessons/${lesson}/index.html`)); await S(900);
      const steps = await pg.evaluate(() => document.querySelectorAll('nav[aria-label="Lesson steps"] button').length);
      for (let c = 1; c <= steps; c++) {
        await pg.evaluate(h => { location.hash = h; }, `#s${c}`); await S(500);
        const n = await pg.evaluate(() => { const e = document.querySelector('[aria-label^="Part"]'); return e ? +e.getAttribute('aria-label').split(' of ')[1] : 1; });
        const h2 = new Set(), bd = new Set();
        for (let k = 0; k < n; k++) {
          await pg.evaluate(h => { location.hash = h; }, `#s${c}${k ? 'b' + (k + 1) : ''}`); await S(450);
          const r = await pg.evaluate((root, board) => ({ h2: Math.round(document.querySelector(root + ' h2').getBoundingClientRect().top), bd: Math.round(document.querySelector(board).getBoundingClientRect().top) }), root, board);
          h2.add(r.h2); bd.add(r.bd);
        }
        if (h2.size !== 1) F(`${lesson} @${W} step ${c}: the heading moves between beats: ${[...h2]}`);
        if (bd.size !== 1) F(`${lesson} @${W} step ${c}: the board moves between beats: ${[...bd]}`);
      }
    }
    await pg.close();
  }
  console.log(fails.length ? fails.length + ' FAILED' : 'title stable ok'); await b.close(); site.close(); process.exit(fails.length ? 1 : 0);
})();
