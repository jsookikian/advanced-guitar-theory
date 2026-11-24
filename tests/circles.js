// Rule: every note name and interval in the lesson's text is a circle (roots red). Walks every beat, the Explore card, the
// "Helps to know" list and every tutorial step, and fails on any note or interval left as plain text.
// What counts as one is src/shared/tokens.json. Exempt: chord and scale names (bold, headings, the name under the board),
// the board's own SVG, the step chips, and form controls (the Key select cannot hold a circle).
const tok = require('../src/shared/tokens.json');
const { launch, open, frames, runner } = require('./helpers');
(async () => {
  const env = await launch(); const { F, fails, finish } = runner('circles');
  const pg = await open(env.b, env.site, 'dominant-pentatonics', { w: 390, h: 844 });
  const scan = where => pg.evaluate((src, flags, where) => {
    const re = new RegExp(src, flags); const ex = '.nine-note,[data-pip],strong,h1,h2,#nine-name,svg,nav,select,option,label,style,script,a,button[aria-pressed],#nine-settings,#nine-tip';
    const bad = []; const w = document.createTreeWalker(document.getElementById('nine-root'), NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) {
      const t = n.nodeValue; if (!t.trim() || n.parentElement.closest(ex)) continue;
      // A chord name set in pieces (C, raised 9; G, raised m6, / E): its letter sits beside a raised span, and is part of the chord name.
      const sib = n.nextSibling, prv = n.previousSibling; if ((sib && sib.nodeType === 1 && sib.dataset && sib.dataset.sup) || (prv && prv.nodeType === 1 && prv.dataset && prv.dataset.sup)) continue;
      // [x] is a deliberate circle only when it was rendered as one; a literal bracket left in text is a bug too.
      for (const m of t.matchAll(re)) bad.push(where + ': "' + m[0] + '" in "' + t.trim().slice(0, 70) + '"');
    }
    return bad;
  }, tok.source, tok.flags, where);
  const click = async t => { await pg.evaluate(t => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t)).click(), t); await frames(pg); };
  const nb = [3, 2, 4, 3, 3, 6, 3, 1];
  for (let c = 0; c < 8; c++) {
    await pg.evaluate(c => document.querySelectorAll('nav[aria-label="Lesson steps"] button')[c].click(), c); await frames(pg);
    for (let k = 0; k < nb[c]; k++) { (await scan('card ' + (c + 1) + ' beat ' + (k + 1))).forEach(F); if (k < nb[c] - 1) await click('Continue'); }
  }
  await pg.evaluate(() => document.querySelectorAll('nav[aria-label="Lesson steps"] button')[0].click()); await frames(pg);
  await click('Helps to know'); (await scan('helps to know')).forEach(F);
  await pg.evaluate(() => document.getElementById('nine-settings-tutorial').click());
  await pg.waitForSelector('[role=dialog][aria-label=Tutorial]');
  for (let i = 0; i < 13; i++) {
    (await scan('tutorial ' + (i + 1))).forEach(F);
    const sig = await pg.evaluate(() => document.querySelector('[role=dialog]').innerText);
    await pg.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent === 'Next' || b.textContent === 'Done').click());
    await pg.waitForFunction(s => { const d = document.querySelector('[role=dialog]'); return !d || d.innerText !== s; }, { timeout: 3000 }, sig).catch(() => {});
  }
  (pg.errors || []).forEach(e => F('pageerror ' + e));
  if (!fails.length) console.log('ok');
  await finish(env);
})();
