// Shared harness for the browser tests: one browser, real waits instead of fixed sleeps, and hash navigation that is not a browser navigation.
//
// Why go() does not set location.hash: a same-document navigation makes puppeteer re-create the page's execution context, and an evaluate that races it
// fails with "Attempted to use detached Frame" / "Execution context was destroyed". The lessons listen for `hashchange`, so go() rewrites the hash with
// history.replaceState and fires that event itself: same app behaviour, no navigation, no race.
const puppeteer = require('puppeteer-core');

const CHROME = () => process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** One site server and one Chrome. close() shuts both. */
async function launch(extraArgs = []) {
  const site = await require('./site').start();
  const b = await puppeteer.launch({ executablePath: CHROME(), args: ['--no-sandbox', ...extraArgs], headless: 'new' });
  return { site, b, close: async () => { await b.close(); site.close(); } };
}

/** Two animation frames and a task: enough for React to commit a state change made by an event handler. */
const frames = pg => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0)))));

/**
 * Wait for the page's own CSS animations and transitions to finish (the card slide, the dots sliding along their strings), ignoring the repeating
 * halo pulse. Only needed when a test looks at motion or at something that is drawn by an animation; positions and text are final as soon as React commits.
 */
const settle = async (pg, cap = 1500) => {
  await frames(pg);
  await pg.waitForFunction(() => document.getAnimations().every(a => {
    if (a.playState === 'finished' || a.playState === 'idle') return true;
    const t = a.effect && a.effect.target;
    if (t && t.closest && t.closest('.drop-halo')) return true;
    const timing = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming();
    return !!(timing && timing.iterations === Infinity);
  }), { timeout: cap, polling: 'raf' }).catch(() => {});
};

/** Open a lesson page at a size and wait until it is really ready: loaded, fonts in, the step navigation drawn, and a frame committed. */
async function open(b, site, lesson, { w = 390, h = 844, hash = '', mobile = false } = {}) {
  const pg = await b.newPage();
  pg.on('pageerror', e => { (pg.errors = pg.errors || []).push(e.message); });
  await pg.setViewport({ width: w, height: h, ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
  await pg.goto(site.url(`lessons/${lesson}/index.html${hash}`), { waitUntil: 'load' });
  await pg.waitForSelector('nav[aria-label="Lesson steps"] button');
  await pg.evaluate(() => document.fonts.ready);
  await frames(pg);
  return pg;
}

/** Go to a hash (#s3, #s3b2) without a navigation, and wait for the page to draw it. */
async function go(pg, hash) {
  await pg.evaluate(h => { history.replaceState(null, '', h); window.dispatchEvent(new HashChangeEvent('hashchange')); }, hash);
  await frames(pg);
}

/** How many steps the lesson has and, on the current step, how many beats. */
const stepCount = pg => pg.evaluate(() => document.querySelectorAll('nav[aria-label="Lesson steps"] button').length);
const beatCount = pg => pg.evaluate(() => { const e = document.querySelector('[aria-label^="Part"]'); return e ? +e.getAttribute('aria-label').split(' of ')[1] : 1; });
const hashFor = (step, beat) => `#s${step}${beat ? 'b' + (beat + 1) : ''}`;

/** The lessons, with the ids their pages use. */
const LESSONS = [
  { id: 'dominant-pentatonics', root: '#nine-root', board: '#nine-board', nav: '#nine-nav', hear: '#nine-hear', tutorial: 'nine-settings-tutorial', card: '.nine-card' },
  { id: 'drop-2-chords', root: '#drop-root', board: '#drop-board', nav: '#drop-nav', hear: '#drop-hear', tutorial: 'drop-settings-tutorial', card: '.drop-card' },
  { id: 'drop-3-chords', root: '#drop-root', board: '#drop-board', nav: '#drop-nav', hear: '#drop-hear', tutorial: 'drop-settings-tutorial', card: '.drop-card' },
  { id: 'sus-chords', root: '#drop-root', board: '#drop-board', nav: '#drop-nav', hear: '#drop-hear', tutorial: 'drop-settings-tutorial', card: '.drop-card' },
];

/** A test run: collects failures, prints them as they happen, and sets the exit code at the end. */
function runner(name) {
  const fails = [];
  const F = m => { fails.push(m); if (fails.length <= 40) console.log('FAIL', m); };
  const finish = async env => {
    if (env) await env.close();
    console.log(fails.length ? fails.length + ' FAILED' : name + ' ok');
    process.exit(fails.length ? 1 : 0);
  };
  return { F, fails, finish };
}

/** Run async jobs at once (they share one browser) and wait for all of them. */
const all = jobs => Promise.all(jobs.map(j => j()));

module.exports = { launch, open, go, frames, settle, sleep, stepCount, beatCount, hashFor, LESSONS, runner, all };
