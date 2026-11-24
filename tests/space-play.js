// Space plays (and stops) the sound in every lesson: it presses Hear it, never scrolls the page, does not also activate a focused button, and is left alone in
// form fields and while the tutorial is open.
const { launch, open, frames, sleep, LESSONS, runner, all } = require('./helpers');
(async () => {
  const env = await launch(['--autoplay-policy=no-user-gesture-required']); const { F, finish } = runner('space play');
  await all(LESSONS.map(L => async () => {
    const pg = await open(env.b, env.site, L.id, { w: 390, h: 500, hash: '#s2' });
    const waitPressed = want => pg.waitForFunction((s, w) => { const e = document.querySelector(s); return !!e && (e.getAttribute('aria-pressed') === 'true') === w; }, { timeout: 3000 }, L.hear, want).then(() => true, () => false);
    const pressed = () => pg.$eval(L.hear, e => e.getAttribute('aria-pressed') === 'true');
    const quiet = async () => { await frames(pg); await sleep(120); };   // a key that must do nothing: give it time to (wrongly) do something
    if (await pressed()) F(`${L.id}: playing before any key`);
    const y0 = await pg.evaluate(() => scrollY);
    await pg.keyboard.press('Space');
    if (!(await waitPressed(true))) F(`${L.id}: Space did not start playing`);
    if ((await pg.evaluate(() => scrollY)) !== y0) F(`${L.id}: Space scrolled the page`);
    await pg.keyboard.press('Space');
    if (!(await waitPressed(false))) F(`${L.id}: a second Space did not stop playing`);
    // with Continue focused, Space plays and does not also go to the next beat
    await pg.focus(`${L.nav} button:last-child`); const h0 = await pg.evaluate(() => location.hash);
    await pg.keyboard.press('Space');
    if (!(await waitPressed(true))) F(`${L.id}: Space with Continue focused did not play`);
    await quiet(); const h1 = await pg.evaluate(() => location.hash);
    if (h1 !== h0) F(`${L.id}: Space on the focused Continue button also moved on (${h0} to ${h1})`);
    await pg.keyboard.press('Space'); await waitPressed(false);
    // a select keeps its own Space
    await pg.evaluate(() => document.querySelector('button[aria-label="Display settings"]').click());
    await pg.waitForFunction(() => { const s = document.querySelector('select'); return s && getComputedStyle(s).visibility === 'visible'; }, { timeout: 3000 }).catch(() => {});
    await pg.focus('select'); await pg.keyboard.press('Space'); await quiet();
    if (await pressed()) F(`${L.id}: Space in a select started playing`);
    await pg.keyboard.press('Escape'); await pg.evaluate(() => document.activeElement && document.activeElement.blur());
    // the tutorial owns the keyboard
    await pg.evaluate(id => document.getElementById(id).click(), L.tutorial);
    await pg.waitForSelector('[role=dialog][aria-label=Tutorial]', { timeout: 5000 }).catch(() => F(`${L.id}: the tutorial did not open`));
    await pg.keyboard.press('Space'); await quiet();
    if (await pg.evaluate(sel => { const e = document.querySelector(sel); return !!e && e.getAttribute('aria-pressed') === 'true'; }, L.hear)) F(`${L.id}: Space played during the tutorial`);
    (pg.errors || []).forEach(e => F(`${L.id} pageerror ${e}`));
    await pg.close();
  }));
  await finish(env);
})();
