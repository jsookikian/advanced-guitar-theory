// Drop 3 theory, all 12 keys: placements, the Drop 3 derivation, strings (bass, one silent string, three neighbours), inversions and slash names,
// the one-note-at-a-time path, the relative chords, and the walk.
const esbuild = require('esbuild'), path = require('path'); const N = require('./notation');
const out = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/shared/drop/theory.ts')], bundle: true, format: 'cjs', write: false, alias: { 'grok/canvas': path.resolve(__dirname, '../src/shared/grok-canvas-shim.ts') }, jsx: 'automatic' });
const m = { exports: {} }; new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
const T = m.exports, { KEYS } = require('./keys.js'); const D3 = T.DROP3;
let fails = 0; const F = s => { fails++; if (fails < 40) console.log('FAIL', s); };
const eq = (a, b, w) => { if (JSON.stringify(a) !== JSON.stringify(b)) F(w + ' got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); };
const S0 = [40, 45, 50, 55, 59, 64], roots = KEYS.map(k => ({ id: k.id, pc: k.pc, letter: k.letter }));
const NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }, L = 'CDEFGAB';
const sp = (k, ls, semi) => { const l = (k.letter + ls) % 7; const d = (((k.pc + semi) % 12 - NAT[L[l]] + 18) % 12) - 6; return L[l] + (d < 0 ? '♭'.repeat(-d) : '♯'.repeat(d)); };
eq(D3.order, [[0, 3, 1, 2], [1, 0, 2, 3], [2, 1, 3, 0], [3, 2, 0, 1]], 'Drop 3 voicing order'); eq(D3.sets, [0, 1], 'Drop 3 has bass on string 6 and 5 only');
let nInst = 0;
for (const r of roots) for (const set of D3.sets) for (let inv = 0; inv < 4; inv++) {
  const list = T.instances(r, set, inv, D3); if (!list.length) F(`${r.id} set${set} inv${inv}: no placement`);
  list.forEach(inst => { nInst++;
    for (const q of T.QUALITIES) {
      const pl = T.place(inst, q), ord = D3.order[inv];
      eq(pl.strings, [set, set + 2, set + 3, set + 4], `${r.id} strings (bass, one silent string, three neighbours)`);
      pl.pitches.forEach((p, j) => { if (j && p <= pl.pitches[j - 1]) F('not ascending'); if (p % 12 !== (r.pc + q.offs[ord[j]]) % 12) F(`${r.id} ${q.id} wrong pitch class`); if (p - S0[pl.strings[j]] !== pl.frets[j]) F('fret mismatch'); });
      if (ord[0] !== inv) F('the bass tone is not the inversion');
      if (Math.min(...pl.frets) < 0 || Math.max(...pl.frets) > 24 || Math.max(...pl.frets) - Math.min(...pl.frets) > 5) F(`${r.id} fret range ${pl.frets}`);
      // Drop 3 derivation: close chord (four tones within an octave); drop its THIRD note from the top (the second from the bottom) an octave.
      const c = T.viewVoices(inst, q, 'closed'), sk = T.viewVoices(inst, q, 'skip'), d = T.viewVoices(inst, q, 'drop');
      if (!c || !sk || !d) continue; // low placements cannot show the close chord (negative frets); the lesson's home placement is checked below
      const cs = [...c].sort((a, b) => a.pitch - b.pitch); if (cs[3].pitch - cs[0].pitch >= 12) F('close chord wider than an octave');
      c.forEach((v, i) => { if (v.pitch - S0[v.s] !== v.f) F('closed fret'); });
      eq(cs.map(v => v.s), [set + 1, set + 2, set + 3, set + 4], `${r.id} close chord on four neighbouring strings`);
      const closedSorted = cs.map(v => v.pitch), want = [closedSorted[1] - 12, closedSorted[0], closedSorted[2], closedSorted[3]];
      eq([...d].sort((a, b) => a.pitch - b.pitch).map(v => v.pitch), want, `${r.id} ${q.id} Drop 3 pitches from the close chord`);
      // skip: only the bass moved (an octave down, to the bass string); drop: only the lowest of the three upper notes stepped across.
      c.forEach((v, i) => { const w = sk[i]; if (v.tone === inv) { if (w.pitch !== v.pitch - 12 || w.s !== set) F(`${r.id} the dropped note did not land on the bass string`); } else if (w.s !== v.s || w.f !== v.f) F(`${r.id} ${q.id} skip moved tone ${v.tone}`); });
      const stepTone = ord[1]; sk.forEach((v, i) => { const w = d[i]; if (v.tone === stepTone) { if (w.pitch !== v.pitch || w.s !== set + 2 || v.s !== set + 1) F(`${r.id} ${q.id} step across wrong`); } else if (w.s !== v.s || w.f !== v.f) F(`${r.id} ${q.id} drop moved tone ${v.tone}`); });
    }
  });
  // names and slash chords
  for (const q of T.QUALITIES) { const nm = T.chordName(r, q, inv), bn = T.toneNote(r, q, inv), simple = bn.length > 2 ? N.simpleBass(bn) : bn, plain = N.chordSymbol(T.rootName(r), T.kindOf(q)); if (nm !== (inv ? plain + '/' + simple : plain)) F(`${r.id} ${q.id} inv${inv} name ${nm}`); }
}
// The lesson's opening (bass on string 5, 1st inversion) fits its window in every key, for the four qualities of the first steps.
const four = ['maj7', 'dom7', 'm7', 'hdim'].map(T.Q), views = ['closed', 'skip', 'drop'];
for (const r of roots) { const list = T.instances(r, 1, 1, D3), inst = list[T.homeFor(list, four, views)]; const wl = T.windowFor(inst, four, views); if (wl === null) F(`${r.id} opening does not fit`); else console.log(r.id.padEnd(2), 'Drop 3 opening: close chord frets', T.viewVoices(inst, four[0], 'closed').map(v => v.f).join(','), 'window', wl);
  if (r.id === 'C') { eq(T.viewVoices(inst, four[0], 'closed').map(v => v.f), [10, 9, 8, 7], 'C close chord D10 G9 B8 e7'); eq(T.viewVoices(inst, four[0], 'skip')[1] && [T.viewVoices(inst, four[0], 'skip')[1].s, T.viewVoices(inst, four[0], 'skip')[1].f], [1, 7], 'C: the 3rd lands on the A string at fret 7'); eq(T.viewVoices(inst, four[0], 'drop')[0] && [T.viewVoices(inst, four[0], 'drop')[0].s, T.viewVoices(inst, four[0], 'drop')[0].f], [3, 5], 'C: the root steps to the G string at fret 5'); } }
// The one-note-at-a-time path and the relative chords, in Drop 3 placements too.
const mid = { ...T.Q('m6'), ls: [0, 2, 4, 6] }, lpath = [T.Q('maj7'), T.Q('dom7'), T.Q('m7'), T.Q('hdim'), T.Q('dim7'), mid, T.Q('m6'), T.Q('six')];
const wantMoves = [[3, -1], [1, -1], [2, -1], [3, -1], [2, 1], null, [1, 1]];
for (const r of roots) for (const set of D3.sets) for (let inv = 0; inv < 4; inv++) T.instances(r, set, inv, D3).forEach(inst => { for (let i = 0; i + 1 < lpath.length; i++) {
  const a = T.place(inst, lpath[i]), b = T.place(inst, lpath[i + 1]), ord = D3.order[inv]; const diffs = a.pitches.map((p, j) => [ord[j], b.pitches[j] - p]).filter(x => x[1] !== 0);
  if (wantMoves[i] === null) { if (diffs.length) F('respell changed a pitch'); } else if (diffs.length !== 1 || diffs[0][0] !== wantMoves[i][0] || diffs[0][1] !== wantMoves[i][1]) F(`${r.id} path step ${i + 1} changed ${JSON.stringify(diffs)}`); } });
// The walk on Drop 3 strings: adjacent-skip layout, ii in inversion r, ascending, V and i closest.
let nWalk = 0, maxFret = 0;
for (const r of roots) for (const minor of [true, false]) for (const set of D3.sets) {
  const W = T.walkChords(r, minor, set, D3); nWalk++; if (W.length !== 4) { F('walk rounds'); continue; } let last = -1;
  W.forEach((round, ri) => { round.forEach((c, ci) => { const pl = T.place(c.inst, c.q); eq(pl.strings, [set, set + 2, set + 3, set + 4], 'walk strings'); maxFret = Math.max(maxFret, ...pl.frets);
    if (Math.min(...pl.frets) < 0 || Math.max(...pl.frets) > 24) F(`${r.id} walk off the neck`);
    if (ci > 0) { const prev = round[ci - 1], pf = T.place(prev.inst, prev.q).frets; const dist = x => T.place(x.inst, x.q).frets.reduce((s, f, j) => s + Math.abs(f - pf[j]), 0); let best = Infinity; for (let v = 0; v < 4; v++) T.instances(c.root, set, v, D3).forEach(inst => { if (Math.min(...T.place(inst, c.q).frets) >= 1) best = Math.min(best, dist({ inst, q: c.q })); }); if (dist(c) !== best) F(`${r.id} walk not closest ${dist(c)} vs ${best}`); } });
    if (round[0].inst.inv !== ri) F('round inversion'); const bass = T.place(round[0].inst, round[0].q).pitches[0]; if (bass <= last) F('ii bass does not climb'); last = bass; });
}
console.log(`drop3 theory: ${roots.length} keys, ${nInst} placements, ${nWalk} walks (highest fret ${maxFret}), fails ${fails}`); process.exit(fails ? 1 : 0);
