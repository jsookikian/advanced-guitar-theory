// Theory checks for the Drop 2 lesson, over all 12 keys: spellings, intervals, pitches, frets, the Drop 2 derivation, and the one-note-at-a-time chains.
const esbuild = require('esbuild'), path = require('path');
const out = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/lessons/drop-2-chords/theory.ts')], bundle: true, format: 'cjs', write: false, alias: { 'grok/canvas': path.resolve(__dirname, '../src/shared/grok-canvas-shim.ts') }, jsx: 'automatic' });
const m = { exports: {} }; new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
const T = m.exports; const N = require('./notation'); const { KEYS } = require('./keys.js');
let fails = 0; const F = s => { fails++; if (fails < 40) console.log('FAIL', s); };
const NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }, L = 'CDEFGAB';
const pcOf = n => { let pc = NAT[n[0]]; for (const c of n.slice(1)) pc += c === '♭' ? -1 : 1; return (pc + 120) % 12; };
const roots = KEYS.map(k => ({ id: k.id, pc: k.pc, letter: k.letter }));
const qid = i => T.QUALITIES[i].id;
// C: the three chords of the one-note-at-a-time section, spelled in full.
const C = roots[0], tn = id => [0, 1, 2, 3].map(t => T.toneNote(C, T.Q(id), t)), iv = id => [0, 1, 2, 3].map(t => T.toneIv(T.Q(id), t));
const eq = (a, b, w) => { if (JSON.stringify(a) !== JSON.stringify(b)) F(w + ' got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); };
eq(tn('dim7'), ['C', 'E♭', 'G♭', 'B♭♭'], 'Cdim7 notes'); eq(tn('m6'), ['C', 'E♭', 'G', 'A'], 'Cm6 notes'); eq(tn('six'), ['C', 'E', 'G', 'A'], 'C6 notes');
eq(iv('dim7'), ['R', '♭3', '♭5', '♭♭7'], 'dim7 ivs'); eq(iv('m6'), ['R', '♭3', '5', '6'], 'm6 ivs'); eq(iv('six'), ['R', '3', '5', '6'], '6 ivs');
eq(tn('hdim'), ['C', 'E♭', 'G♭', 'B♭'], 'Cm7b5'); eq(tn('maj7'), ['C', 'E', 'G', 'B'], 'Cmaj7');
let nInst = 0, nChord = 0;
for (const r of roots) {
  for (const q of T.QUALITIES) for (let t = 0; t < 4; t++) {
    const n = T.toneNote(r, q, t);
    if (n[0] !== L[(r.letter + q.ls[t]) % 7]) F(`${r.id} ${q.id} tone ${t} wrong letter ${n}`);
    if (pcOf(n) !== (r.pc + q.offs[t]) % 12) F(`${r.id} ${q.id} tone ${t} wrong pitch ${n}`);
    if (n.length > 3) F(`${r.id} ${q.id} tone ${t} triple accidental ${n}`);
    nChord++;
  }
  // The 6 chord is the minor 7 chord of its relative minor, spelled from its 6th.
  const six = [0, 1, 2, 3].map(t => T.toneNote(r, T.Q('six'), t)); const rel = T.spellAt(r, 5, 9);
  if (six[3] !== rel) F(`${r.id} 6 note ${six[3]} vs ${rel}`);
  for (let set = 0; set < 3; set++) for (let inv = 0; inv < 4; inv++) {
    const list = T.instances(r, set, inv); if (list.length < 1) F(`${r.id} set${set} inv${inv} has no placement`);
    // The Drop 2 derivation: the close chord with its second note from the top dropped is this voicing.
    const c = T.CLOSE[inv], d = [c[2], c[0], c[1], c[3]]; eq(d, T.ORDER[inv], 'drop 2 order inv' + inv);
    list.forEach(inst => {
      nInst++;
      for (const q of T.QUALITIES) {
        const pl = T.place(inst, q); const ord = T.ORDER[inv];
        pl.pitches.forEach((p, j) => {
          if (p % 12 !== (r.pc + q.offs[ord[j]]) % 12) F(`${r.id} ${q.id} set${set} inv${inv} voice ${j} wrong pitch class`);
          if (p - [40, 45, 50, 55, 59, 64][set + j] !== pl.frets[j]) F('fret mismatch');
          if (j && p <= pl.pitches[j - 1]) F('not ascending');
        });
        if (Math.max(...pl.frets) - Math.min(...pl.frets) > 5) F('span > 5 ' + r.id);
        if (Math.min(...pl.frets) < 0 || Math.max(...pl.frets) > 24) F('off the neck ' + r.id);
        // Drop 2 shape: the top-to-bottom gaps are a close chord with one voice dropped, so the whole chord spans less than 2 octaves, over one octave.
        const sp = pl.pitches[3] - pl.pitches[0]; if (sp < 12 || sp > 21) F(`${r.id} ${q.id} span ${sp}`);
      }
      { const wl = T.windowFor(inst, T.QUALITIES, ['drop']); if (wl !== null) for (const q of T.QUALITIES) for (const f of T.place(inst, q).frets) if (f < wl || f > (wl === 0 ? 7 : wl + 6)) F(`${r.id} fret ${f} outside window ${wl}`); }
      // One note at a time: each quality change moves exactly the voices that should move.
      const f = id => T.place(inst, T.Q(id)).frets, diff = (a, b) => f(a).map((x, j) => x - f(b)[j]);
      const ord = T.ORDER[inv], at = tone => ord.indexOf(tone);
      const only = (a, b, tone, by, w) => { const d = diff(b, a).map((x, j) => (j === at(tone) ? x - by : x)); if (d.some(x => x !== 0)) F(`${r.id} ${w} wrong voices ${JSON.stringify(diff(b, a))}`); };
      only('maj7', 'dom7', 3, -1, 'maj7>7'); only('dom7', 'm7', 1, -1, '7>m7'); only('m7', 'hdim', 2, -1, 'm7>m7b5');
      only('dim7', 'm6', 2, 1, 'dim7>m6 (the 5th rises, the rest stay, incl. the bb7/6 respelling)');
      only('m6', 'six', 1, 1, 'm6>6');
      if (f('dim7')[at(3)] !== f('m6')[at(3)]) F('respelled note moved');
    });
  }
  // ii V I.
  const pr = T.progression(r, 1);
  const want = [N.chordSymbol(T.spellAt(r, 1, 2), 'm7'), N.chordSymbol(T.spellAt(r, 4, 7), 'dom7'), N.chordSymbol(T.rootName(r), 'maj7')];
  pr.forEach((c, i) => { const nm = T.chordName(c.root, c.q); if (nm !== want[i]) F(`${r.id} progression chord ${nm} vs ${want[i]}`); });
  { const pcs = pr.map(c => T.place(c.inst, c.q)); for (let i = 1; i < 3; i++) { const a = [...pcs[i - 1].pitches].sort((x, y) => x - y), b = [...pcs[i].pitches].sort((x, y) => x - y); const mv = a.map((x, j) => Math.abs(x - b[j])); if (Math.max(...mv) > 4) F(`${r.id} progression jump ${mv}`); } }
  if (pr.length !== 3) F(r.id + ' no progression');
}
// Closed, then drop: the opening example (2nd inversion, bass on string 5) in every key, for the four qualities of the first steps.
const four = ['maj7', 'dom7', 'm7', 'hdim'].map(T.Q), views = ['closed', 'skip', 'drop'], S0 = [40, 45, 50, 55, 59, 64];
for (const r of roots) {
  const list = T.instances(r, 1, 2), hi = T.homeFor(list, four, views), inst = list[hi];
  if (!T.windowFor(inst, four, views)) F(`${r.id} no opening placement fits the window`);
  const wl = T.windowFor(inst, four, views);
  for (const q of four) {
    const c = T.viewVoices(inst, q, 'closed'), sk = T.viewVoices(inst, q, 'skip'), d = T.viewVoices(inst, q, 'drop');
    if (!c || !sk || !d) { F(`${r.id} ${q.id} a view is missing`); continue; }
    // closed: the top four strings (D G B e, indices 2-5), tones R 3 5 7 ascending from the D string, all within an octave, spelled right
    eq(c.map(v => v.s), [2, 3, 4, 5], r.id + ' closed strings'); eq(c.map(v => v.tone), [0, 1, 2, 3], r.id + ' closed tones');
    c.forEach((v, i) => { if (i && v.pitch <= c[i - 1].pitch) F(r.id + ' closed not ascending'); if (v.pitch - S0[v.s] !== v.f) F('closed fret'); if ((v.pitch % 12 + 120) % 12 !== (r.pc + q.offs[v.tone]) % 12) F(r.id + ' closed pitch class'); });
    if (c[3].pitch - c[0].pitch >= 12) F(r.id + ' closed chord wider than an octave');
    // skip: only the fifth moved, down exactly an octave, onto the A string; the other three did not move at all.
    c.forEach((v, i) => { const w = sk[i]; if (v.tone === 2) { if (w.pitch !== v.pitch - 12 || w.s !== 1) F(`${r.id} ${q.id} the 5th did not drop an octave onto the A string`); } else if (w.s !== v.s || w.f !== v.f) F(`${r.id} ${q.id} skip moved tone ${v.tone}`); });
    // drop: now only the seventh moved, from the high e string to the B string, same pitch; the bass is the fifth.
    sk.forEach((v, i) => { const w = d[i]; if (v.tone === 3) { if (w.pitch !== v.pitch || v.s !== 5 || w.s !== 4) F(`${r.id} ${q.id} the top note did not step e to B`); } else if (w.s !== v.s || w.f !== v.f) F(`${r.id} ${q.id} drop moved tone ${v.tone}`); });
    if ([...d].sort((a, b) => a.pitch - b.pitch)[0].tone !== 2) F(r.id + ' bass is not the fifth');
    [c, sk, d].forEach(vs => vs.forEach(v => { if (v.f < wl || v.f > (wl === 0 ? 7 : wl + 6)) F(`${r.id} ${q.id} dot outside window`); }));
  }
  // The shape the lesson opens with, in C: D 10, G 9, B 8, e 7 closed; the 5 to A 10; the 7 to B 12.
  if (r.id === 'C') { const q = T.Q('maj7'); eq(T.viewVoices(inst, q, 'closed').map(v => v.f), [10, 9, 8, 7], 'C closed frets'); eq(T.viewVoices(inst, q, 'skip').map(v => [v.s, v.f]).filter((_, i) => i === 2)[0], [1, 10], 'C 5th on A string fret 10'); eq(T.viewVoices(inst, q, 'drop')[3] && [T.viewVoices(inst, q, 'drop')[3].s, T.viewVoices(inst, q, 'drop')[3].f], [4, 12], 'C 7th on B string fret 12'); }
  console.log(r.id.padEnd(2), 'opening: closed frets', T.viewVoices(inst, four[0], 'closed').map(v => v.f).join(','), 'window', wl);
}
// Names: slash chords by inversion, in both notation styles, in every key; the bass is the chord's own note (a double accidental is simplified).
for (const r of roots) for (const q of T.QUALITIES) for (let inv = 0; inv < 4; inv++) {
  const nm = T.chordName(r, q, inv), bassNote = T.toneNote(r, q, T.ORDER[inv][0]);
  const simple = bassNote.length > 2 ? N.simpleBass(bassNote) : bassNote;
  const plain = N.chordSymbol(T.rootName(r), T.kindOf(q));
  if (nm !== (inv ? plain + '/' + simple : plain)) F(`${r.id} ${q.id} inv${inv} name ${nm}`);
  if (inv && /\u266d\u266d|\u266f\u266f/.test(nm.split('/')[1])) F(nm + ' bass still has a double accidental');
  const pcOf = n => { const NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }; let v = NAT[n[0]]; for (const c of n.slice(1)) v += c === '\u266d' ? -1 : 1; return (v + 120) % 12; };
  if (inv && pcOf(simple) !== pcOf(bassNote)) F(nm + ' simplified bass is a different pitch');
  const sym = N.chordSymbol('C', T.kindOf(q), undefined, 'symbols'), let_ = N.chordSymbol('C', T.kindOf(q), undefined, 'letters');
  if (r.id === 'C' && inv === 0) console.log('  C', q.id.padEnd(5), sym.padEnd(5), let_);
}
eq(N.chordSymbol('C', 'maj7', 'G'), 'C\uE18A7/G', 'C triangle 7 over G'); eq(N.chordSymbol('G', 'm6', 'E'), 'G-6/E', 'G-6/E'); eq(N.chordSymbol('C', 'dim7', 'A'), 'C\uE1877/A', 'C circle 7 over A'); eq(N.chordSymbol('C', 'hdim'), 'C\uE18F7', 'half-diminished'); eq(N.spokenName('C\uE18A7/G'), 'Cmaj7 over G', 'spoken name');
eq(N.chordSymbol('C', 'maj7', 'G', 'letters'), 'Cmaj7/G', 'letters style'); eq(N.chordSymbol('E', 'hdim', undefined, 'letters'), 'Em7\u266d5', 'letters half-diminished');
eq(N.asciiName('C\uE18A7/G'), 'cmaj7overg', 'ascii name'); eq(N.simpleBass('B\u266d\u266d'), 'A', 'B double flat is A'); eq(N.simpleBass('E\u266d\u266d'), 'D', 'E double flat is D'); eq(N.simpleBass('F\u266f'), 'F\u266f', 'single accidental unchanged');
// The ii V i walk: every key, minor and major, all three string sets.
let nWalk = 0, maxFret = 0; const walkTop = {};
for (const r of roots) for (const minor of [true, false]) for (const set of [0, 1, 2]) {
  const W = T.walkChords(r, minor, set); nWalk++;
  if (W.length !== 4) { F(`${r.id} walk has ${W.length} rounds`); continue; }
  let lastBass = -1;
  const quals = minor ? ['hdim', 'dom7', 'm6'] : ['m7', 'dom7', 'maj7'], offs = [[1, 2], [4, 7], [0, 0]];
  W.forEach((round, ri) => {
    round.forEach((c, ci) => {
      const q = T.Q(quals[ci]); if (c.q.id !== q.id) F(`${r.id} walk chord quality ${c.q.id}`);
      const rootWant = ci === 2 ? T.rootName(r) : T.spellAt(r, offs[ci][0], offs[ci][1]); if (T.rootName(c.root) !== rootWant) F(`${r.id} walk root ${T.rootName(c.root)} want ${rootWant}`);
      const pl = T.place(c.inst, c.q), ord = T.ORDER[c.inst.inv];
      if (c.inst.set !== set) F('walk string set');
      pl.strings.forEach((s2, j) => { if (s2 !== set + j) F('walk voicing not on adjacent strings'); });
      pl.pitches.forEach((pp, j) => { if (j && pp <= pl.pitches[j - 1]) F('walk voicing not ascending'); if (pp % 12 !== (c.root.pc + c.q.offs[ord[j]]) % 12) F(`${r.id} walk wrong pitch class`); });
      maxFret = Math.max(maxFret, ...pl.frets); if (Math.min(...pl.frets) < 0 || Math.max(...pl.frets) > 24) F(`${r.id} walk off the neck ${pl.frets}`);
      // closest: no other voicing of this chord on the set (any inversion, any place, no open string) is nearer to the previous chord
      if (ci > 0) {
        const prev = round[ci - 1], pf = T.place(prev.inst, prev.q).frets; const dist = x => T.place(x.inst, x.q).frets.reduce((s3, f, j) => s3 + Math.abs(f - pf[j]), 0);
        let best = Infinity; for (let inv = 0; inv < 4; inv++) T.instances(c.root, set, inv).forEach(inst => { const x = { inst, q: c.q }; if (Math.min(...T.place(inst, c.q).frets) >= 1) best = Math.min(best, dist(x)); });
        if (dist(c) !== best) F(`${r.id} ${minor ? 'minor' : 'major'} set${set} round ${ri + 1} chord ${ci + 1}: distance ${dist(c)} but the closest is ${best}`);
      }
    });
    if (round[0].inst.inv !== ri) F(`${r.id} round ${ri + 1} starts in inversion ${round[0].inst.inv}`);
    const bass = T.place(round[0].inst, round[0].q).pitches[0]; if (bass <= lastBass) F(`${r.id} ii bass does not climb in round ${ri + 1}`); lastBass = bass;
  });
}
console.log(`walk: ${nWalk} walks, highest fret used ${maxFret}`);
console.log(`drop2 theory: ${roots.length} keys, ${nChord} chord tones, ${nInst} placements, fails ${fails}`);
process.exit(fails ? 1 : 0);
