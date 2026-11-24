// The tutorial on a short phone screen, in every lesson: it walks to the end without errors, and each lit control ends up between the pinned header
// and the fixed bottom bar (never under them). The lit box is the one element in the dialog drawn with an outline around the target.
const p = require('puppeteer-core');
(async () => {
  const site = await require('./site').start(); const b = await p.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'], headless: 'new' });
  const S = t => new Promise(r => setTimeout(r, t)); const fails = []; const F = m => { fails.push(m); console.log('FAIL', m); };
  for (const [lesson, tut] of [['dominant-pentatonics', 'nine-settings-tutorial'], ['drop-2-chords', 'drop-settings-tutorial'], ['drop-3-chords', 'drop-settings-tutorial'], ['sus-chords', 'drop-settings-tutorial']]) {
    const pg = await b.newPage(); pg.on('pageerror', e => F(lesson + ' pageerror ' + e.message));
    await pg.setViewport({ width: 390, height: 560 }); await pg.goto(site.url(`lessons/${lesson}/index.html`)); await S(800);
    await pg.evaluate(id => document.getElementById(id).click(), tut); await S(700);
    let n = 0;
    for (; n < 30; n++) {
      if (!(await pg.$('[role=dialog][aria-label=Tutorial]'))) break;
      await S(900);
      const r = await pg.evaluate(() => {
        const hd = document.querySelector('.agt-sticky'), bar = document.querySelector('.agt-bottombar');
        const top = hd ? hd.getBoundingClientRect().bottom : 0, bottom = bar ? bar.getBoundingClientRect().top : innerHeight;
        const dlg = document.querySelector('[role=dialog][aria-label=Tutorial]');
        const lit = [...dlg.querySelectorAll('div')].find(d => getComputedStyle(d).position === 'absolute' && /px/.test(d.style.width || '') && /px/.test(d.style.height || '') && d.style.top);
        if (!lit) return null; const rc = lit.getBoundingClientRect(); return { top, bottom, t: Math.round(rc.top), b: Math.round(rc.bottom) };
      });
      if (r && !(r.t >= r.top - 2 || r.b <= r.top + 2) ) F(`${lesson} step ${n + 1}: lit box ${r.t}-${r.b} sits under the header (${r.top})`);
      if (r && r.b > r.bottom + 40 && r.t < r.bottom) F(`${lesson} step ${n + 1}: lit box ${r.t}-${r.b} sits under the bottom bar (${r.bottom})`);
      await pg.keyboard.press('ArrowRight');
    }
    if (n < 8 || n >= 30) F(`${lesson}: tutorial ran ${n} steps`);
    console.log(lesson, 'steps', n); await pg.close();
  }
  console.log(fails.length ? fails.length + ' FAILED' : 'pinned tutorial ok'); await b.close(); site.close(); process.exit(fails.length ? 1 : 0);
})();
