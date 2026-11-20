// Explore card: the scrolling neck keeps the shape centred (also after an arrow step), and both neck modes keep the board's height.
// Writes full390.png / scroll390.png / scroll320.png to the current directory.
const p = require('puppeteer-core');
const url = require('url').pathToFileURL(require('path').resolve(__dirname, '../lessons/dominant-pentatonics/index.html')).href;
(async () => {
  const b = await p.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  const pg = await b.newPage();
  pg.on('pageerror', e => console.log('ERR', e.message));
  const S = t => new Promise(r => setTimeout(r, t));
  const fails = [];
  const F = m => { fails.push(m); console.log('FAIL', m); };
  for (const W of [320, 390]) {
    await pg.setViewport({ width: W, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto(url); await S(600);
    const m = () => pg.evaluate(() => {
      const s = document.getElementById('nine-board'); const r = s.getBoundingClientRect();
      const sc = document.getElementById('nine-scroll');
      const box = (sc || s.parentElement).getBoundingClientRect();
      const vis = [...s.querySelectorAll('g[data-vis="1"] circle')].map(c => { const q = c.getBoundingClientRect(); return q.left + q.width / 2; });
      const mid = (Math.min(...vis) + Math.max(...vis)) / 2;
      return { boardTop: Math.round(box.top), boxH: Math.round(box.height), scrollable: !!sc && sc.scrollWidth > sc.clientWidth + 10, off: Math.round(mid - (box.left + box.width / 2)), pageSX: document.documentElement.scrollWidth > innerWidth, shape: document.getElementById('nine-shape').dataset.p };
    });
    await pg.evaluate(() => [...document.querySelectorAll('nav[aria-label="Lesson steps"] button')][5].click()); await S(400);
    const drop = await m();
    await pg.evaluate(() => [...document.querySelectorAll('nav[aria-label="Lesson steps"] button')][6].click()); await S(900);
    const a = await m();
    if (!a.scrollable) F(W + ' not scrollable');
    if (Math.abs(a.off) > 30) F(W + ' shape off-centre by ' + a.off);
    if (a.boxH !== drop.boxH) F(W + ' board height differs from the other cards ' + JSON.stringify([drop, a]));
    if (W === 390) await pg.screenshot({ path: 'scroll390.png' });
    // Arrow steps re-centre on the new shape.
    for (let i = 0; i < 3; i++) {
      await pg.click('.nine-arrow:last-of-type'); await S(1000);
      const t = await m();
      if (Math.abs(t.off) > 30) F(W + ' arrow ' + i + ' off-centre by ' + t.off + ' shape ' + t.shape);
    }
    // Shape button re-centres too.
    await pg.evaluate(() => [...document.querySelectorAll('[aria-label="Shape"] button')][0].click()); await S(1000);
    const sb = await m(); if (Math.abs(sb.off) > 30) F(W + ' shape button off-centre by ' + sb.off);
    // Fit all.
    await pg.evaluate(() => document.querySelector('.nine-icon[aria-label="Display settings"]').click()); await S(400);
    await pg.evaluate(() => [...document.querySelectorAll('#nine-settings button')].find(x => x.textContent.trim() === 'Fit all').click()); await S(900);
    const f = await m();
    if (!(await pg.evaluate(() => !!document.querySelector('[data-band]')))) F(W + ' no band in Fit all');
    if (f.boxH !== a.boxH) F(W + ' Fit all height changed ' + a.boxH + ' -> ' + f.boxH);
    if (f.pageSX) F(W + ' sideways scroll');
    if (W === 390) await pg.screenshot({ path: 'full390.png' });
    if (W === 320) await pg.screenshot({ path: 'scroll320.png' });
    console.log(W, JSON.stringify({ drop, scroll: a, fit: f }));
  }
  console.log('fails', fails.length);
  await b.close();
})();
