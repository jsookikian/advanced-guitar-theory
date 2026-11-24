#!/usr/bin/env node
// Runs the test files in parallel, each in its own process (its own Chrome and site server), and prints one line per test.
//   node run-all.js                run everything
//   node run-all.js sus walk       run just these (names with or without .js)
//   CONC=8 node run-all.js         processes at once (default: half the cores)
//   CHROME=/path/to/chrome         Chrome to drive (default: the macOS Google Chrome)
// A test passes when it exits 0 and its output has no failure marker (several older scripts print "fails N" and never set an exit code).
const { spawn } = require('child_process'), os = require('os'), path = require('path');

const TESTS = [
  // theory and static checks (no browser)
  'walk', 'drop2-theory', 'drop3-theory', 'notation', 'metadata', 'fonts',
  // browser checks, roughly slowest first so the long ones start early
  'sus', 'title-stable', 'no-scroll', 'nav-stable', 'pinned-tutorial', 'space-play', 'desktop-align',
  'circles', 'tutorial', 'fit', 'full', 'persist', 'subpath', 'labels2', 'share', 'wrap', 'names', 'drone', 'drone-drop',
];
const SKIPPED = { drop2: 'known flaky puppeteer "detached Frame" crash (skipped on purpose)', 'drop2-debug': 'scratch copy of drop2' };

const argv = process.argv.slice(2).map(a => a.replace(/\.js$/, ''));
const chosen = argv.length ? argv : TESTS;
const conc = Math.max(1, +process.env.CONC || Math.floor(os.cpus().length / 2));
const env = { ...process.env, CHROME: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' };

const FAIL_MARKERS = [/(^|\n)\s*FAIL\b/, /\b\d+ FAILED\b/, /\bfails [1-9]\d*\b/, /"failCount":\s*[1-9]/, /\bfails? "?[1-9]\d*"?\s*$/m, /(^|\n)(Type|Reference|Syntax)?Error:/, /Unhandled|ERR\b.*pageerror/];
const failed = out => FAIL_MARKERS.some(re => re.test(out));

const t0 = Date.now(); const results = []; let next = 0, running = 0;
for (const n of chosen) if (SKIPPED[n]) console.log(`-  ${n.padEnd(16)} skipped: ${SKIPPED[n]}`);
const queue = chosen.filter(n => !SKIPPED[n]);

function startOne(name) {
  const start = Date.now(); let out = '';
  const file = path.join(__dirname, name + '.js');
  const child = spawn(process.execPath, [file], { cwd: __dirname, env });
  child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { out += d; });
  const killer = setTimeout(() => { out += '\nFAIL timed out after 8 minutes\n'; child.kill('SIGKILL'); }, 8 * 60 * 1000);
  child.on('close', code => {
    clearTimeout(killer); running--;
    const secs = (Date.now() - start) / 1000; const bad = code !== 0 || failed(out);
    results.push({ name, bad, secs });
    console.log(`${bad ? '✗' : '✓'}  ${name.padEnd(16)} ${secs.toFixed(1).padStart(6)}s`);
    if (bad) {
      const lines = out.trim().split('\n'); const fl = lines.filter(l => /^\s*FAIL\b|Error|\bfails [1-9]/.test(l));
      const show = fl.length ? fl.slice(0, 12).concat(['...'], lines.slice(-3)) : lines.slice(-14);
      console.log(show.map(l => '     ' + l.slice(0, 220)).join('\n'));
    }
    pump();
  });
}
function pump() {
  while (running < conc && next < queue.length) { running++; startOne(queue[next++]); }
  if (running === 0 && next >= queue.length) {
    const bad = results.filter(r => r.bad);
    console.log(`\n${results.length - bad.length}/${results.length} passed in ${((Date.now() - t0) / 1000).toFixed(1)}s (${conc} at a time)${bad.length ? '; failed: ' + bad.map(r => r.name).join(', ') : ''}`);
    process.exit(bad.length ? 1 : 0);
  }
}
pump();
