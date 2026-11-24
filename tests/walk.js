// Theory checks for the Drop 2 7sus4 lesson (node only), over all 12 keys: every grip is a real Drop 2 of the chord and inversion it is named as
// (its closed chord sits inside an octave, its lowest note is the named bass), fretted notes only, span <= 4; pair positions are two whole-step
// moves; and for A Dorian the computed grips equal the expected lists (D7sus4 and A7sus4 on the three string sets).
const esbuild = require('esbuild'), path = require('path');
const out = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/lessons/sus-chords/theory.ts')], bundle: true, format: 'cjs', write: false, alias: { 'grok/canvas': path.resolve(__dirname, '../src/shared/grok-canvas-shim.ts') } });
const m = { exports: {} }; new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
const T = m.exports; const { KEYS } = require('./keys.js');
let fails = 0; const F = s => { fails++; if (fails < 40) console.log('FAIL', s); };
const eq = (a, b, w) => { if (JSON.stringify(a) !== JSON.stringify(b)) F(w + ' got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); };
const OPEN = [40, 45, 50, 55, 59, 64], NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOf = n => { let pc = NAT[n[0]]; for (const c of n.slice(1)) pc += c === '♭' ? -1 : 1; return (pc + 120) % 12; };
const roots = KEYS.map(k => ({ id: k.id, pc: k.pc, letter: k.letter }));
const A = roots.find(k => k.id === 'A');
// Expected grips in A Dorian, low string to high, with the bass note: "bass:frets". Octave twins (3-5-2-2 and 15-17-14-14) are both listed.
const WANT = {
  5: { // D7sus4
    0: ['A:5-5-5-5', 'A:17-17-17-17', 'C:8-10-7-7', 'D:10-12-10-12', 'G:15-15-12-14'],
    1: ['A:12-12-12-13', 'C:3-5-2-3', 'C:15-17-14-15', 'D:5-7-5-8', 'G:10-10-7-10'],
    2: ['A:7-7-8-8', 'C:10-12-10-10', 'D:12-14-13-15', 'G:5-5-3-5', 'G:17-17-15-17'],
  },
  0: { // A7sus4
    0: ['E:12-12-12-12', 'G:3-5-2-2', 'G:15-17-14-14', 'A:5-7-5-7', 'D:10-10-7-9'],
    1: ['E:7-7-7-8', 'G:10-12-9-10', 'A:12-14-12-15', 'D:5-5-2-5', 'D:17-17-14-17'],
    2: ['E:2-2-3-3', 'E:14-14-15-15', 'G:5-7-5-5', 'A:7-9-8-10', 'D:12-12-10-12'],
  },
};
for (const rel of [5, 0]) for (const set of [0, 1, 2]) {
  const got = T.dropInsts(A, rel, set).map(i => `${T.noteOf(A, rel, T.tones(i)[0])}:${T.frets(i).join('-')}`).sort();
  eq(got, WANT[rel][set].slice().sort(), `A Dorian ${rel === 5 ? 'D7sus4' : 'A7sus4'} set ${set}`);
}
const NAMES = { 0: 'A7sus4', 5: 'D7sus4', 7: 'E7sus4', 2: 'B7sus4' };
const nm = (k, rel) => { const r = T.chordRoot(k, rel); return T.noteOf(k, rel, 0); };
let nGrips = 0, nPos = 0;
for (const k of roots) for (const rel of [0, 2, 5, 7]) for (const set of [0, 1, 2]) {
  const want = new Set([0, 5, 7, 10].map(o => (T.chordRoot(k, rel).pc + o) % 12));
  const list = T.dropInsts(k, rel, set);
  for (let inv = 0; inv < 4; inv++) if (!list.some(i => i.inv === inv)) F(`${k.id} ${NAMES[rel]} set ${set} has no inversion ${inv}`);
  for (const i of list) {
    nGrips++; const fr = T.frets(i), st = T.strings(i), pit = T.pitches(i), tag = `${k.id} ${NAMES[rel]} set ${set} inv ${i.inv} ${fr}`;
    eq(st, [set, set + 1, set + 2, set + 3], tag + ' strings');
    if (fr.some((f, j) => OPEN[st[j]] + f !== pit[j])) F(tag + ' pitch/fret mismatch');
    if (Math.min(...fr) < 1) F(tag + ' open string'); if (Math.max(...fr) - Math.min(...fr) > 4) F(tag + ' span > 4'); if (Math.max(...fr) > 24) F(tag + ' past 24');
    if (new Set(pit.map(p => p % 12)).size !== 4 || pit.some(p => !want.has(p % 12))) F(tag + ' wrong notes');
    for (let j = 1; j < 4; j++) if (pit[j] <= pit[j - 1]) F(tag + ' not ascending');
    // a real Drop 2: close chord = [p1, p2, p0 + 12, p3] ascends inside an octave, so dropping its second note from the top gives p0 p1 p2 p3
    const closed = [pit[1], pit[2], pit[0] + 12, pit[3]];
    if (!(closed[0] < closed[1] && closed[1] < closed[2] && closed[2] < closed[3] && closed[3] - closed[0] < 12)) F(tag + ' is not a Drop 2 (closed chord ' + closed + ')');
    // ... and the inversion is named by the lowest note: its tone is the one the name says
    const bassTone = T.tones(i)[0]; if ((pit[0] - T.chordRoot(k, rel).pc - [0, 5, 7, 10][bassTone] + 120) % 12 !== 0) F(tag + ' bass is not tone ' + bassTone);
    const name = T.susName(k, rel, i.inv); const slash = name.includes('/') ? name.split('/')[1] : null;
    if (i.inv === 0 ? slash !== null : slash === null || pcOf(slash) !== pit[0] % 12) F(tag + ' name ' + name);
  }
  // pair positions
}
for (const k of roots) for (let pr = 0; pr < 3; pr++) for (let set = 0; set < 3; set++) {
  const list = T.pairPositions(k, pr, set); if (list.length < 2) F(`${k.id} pair ${pr} set ${set} has ${list.length} positions`);
  for (const p of list) { nPos++; const x = T.frets(p.a), y = T.frets(p.b); const mv = x.map((f, j) => y[j] - f).filter(d => d !== 0);
    if (mv.length !== 2 || mv.some(d => Math.abs(d) !== 2)) F(`${k.id} pair ${pr} set ${set} moves ${JSON.stringify(mv)} (${x} to ${y})`); }
}
// The first pair in A Dorian on the highest strings is the one the lesson starts with: D7sus4/G and A7sus4/G.
const lp = T.leadPair(A); eq(T.frets(lp.a), [5, 5, 3, 5], 'lead D7sus4'); eq(T.frets(lp.b), [5, 7, 5, 5], 'lead A7sus4');
eq(T.susName(A, 5, lp.a.inv), 'D7sus4/G', 'lead D7sus4 name'); eq(T.susName(A, 0, lp.b.inv), 'A7sus4/G', 'lead A7sus4 name');
eq([T.frets(lp.b, require('./drop-q.js')('m7')), T.frets(lp.a, require('./drop-q.js')('dom7'))], [[5, 5, 5, 5], [4, 5, 3, 5]], 'lead Am7 and D7 grips') ;
for (const k of roots) {
  const p = T.leadPair(k); if (!p) { F(`${k.id} no lead pair`); continue; }
  // The make steps: D7 in every inversion on every string set is a real Drop 2 dominant 7 whose 3rd, one fret lower, becomes the 7sus4's 4th.
  for (const rel of [5, 0]) for (let set = 0; set < 3; set++) for (let inv = 0; inv < 4; inv++) {
    const m = T.makeInst(k, rel, set, inv); if (!m) { F(`${k.id} ${NAMES[rel]} set ${set} inv ${inv} has no make voicing`); continue; }
    const dq = require('./drop-q.js')('dom7'), ps = T.pitches(m), pd = T.pitches(m, dq), ch = ps.map((x, j) => x - pd[j]).filter(x => x !== 0);
    if (ch.length !== 1 || ch[0] !== 1) F(`${k.id} ${NAMES[rel]} set ${set} inv ${inv}: dom7 to sus4 should move exactly one note up a fret, got ${ch}`);
    if (Math.min(...T.frets(m, dq)) < 1) F(`${k.id} ${NAMES[rel]} set ${set} inv ${inv}: the dom7 has an open string`);
    if (ps.slice().sort((x, y) => x - y).join() !== ps.join()) F(`${k.id} ${NAMES[rel]} set ${set} inv ${inv}: pitches are not bass to top`);
  }
  if (k.id === 'A') eq([0, 1, 2, 3].map(inv => T.frets(T.makeInst(k, 5, 2, inv))), [[12, 14, 13, 15], [5, 5, 3, 5], [7, 7, 8, 8], [10, 12, 10, 10]], 'A: D7sus4 on the top strings, four inversions');
  if (k.id === 'A') eq([0, 1, 2, 3].map(inv => T.frets(T.makeInst(k, 5, 2, inv), require('./drop-q.js')('dom7'))), [[12, 14, 13, 14], [4, 5, 3, 5], [7, 7, 7, 8], [10, 11, 10, 10]], 'A: D7 on the top strings, four inversions');
}
console.log(`${nGrips} Drop 2 grips and ${nPos} pair positions checked over 12 keys x 4 chords x 3 string sets`);
console.log(fails ? fails + ' FAILED' : 'walk ok'); process.exit(fails ? 1 : 0);
