// Drop 2 lesson, in the browser: every note and interval in the text is a circle (circles), the page height never changes between steps
// and nothing overflows at 320/360/390 (fit), the labels on the dots are right in all 12 keys, one note changes at a time (the others do not
// move), the respelled note keeps its fret, roots are red, Explore dots are ink, and Share makes a PNG.
const p=require('puppeteer-core');const N=require('./notation');const tok=require('../src/shared/tokens.json');const {KEYS}=require('./keys.js');
const LESSON=process.env.LESSON||'drop-2-chords',D3=LESSON==='drop-3-chords',OFF=D3?1:0;
const NB=D3?[4,2,2,4,9,14,12,1]:[4,3,4,9,14,12,1];
const NAT={C:0,D:2,E:4,F:5,G:7,A:9,B:11},L='CDEFGAB';
// Independent spelling (not the lesson's code): the letter comes from the interval number, the accidental from the pitch.
const sp=(k,ls,semi)=>{const l=(k.letter+ls)%7;let d=(((k.pc+semi)%12-NAT[L[l]]+18)%12)-6;return L[l]+(d<0?'♭'.repeat(-d):'♯'.repeat(d));};
(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();const fails=[];const F=m=>{fails.push(m);};pg.on('pageerror',e=>F('pageerror '+e.message));
await pg.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await pg.goto(site.url('lessons/'+LESSON+'/index.html'));await S(900);
const step=c=>pg.evaluate(c=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[c].click(),c).then(()=>S(450));
const cont=()=>pg.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Continue')).click()).then(()=>S(450));
const scan=where=>pg.evaluate((src,flags,where)=>{
 const re=new RegExp(src,flags);const ex='[data-pip],strong,h1,h2,#drop-name,svg,nav,select,option,label,style,script,a,[role=radiogroup],#drop-settings,#drop-caption';
 const bad=[];const w=document.createTreeWalker(document.getElementById('drop-root'),NodeFilter.SHOW_TEXT);let n;
 while((n=w.nextNode())){const t=n.nodeValue;if(!t.trim()||n.parentElement.closest(ex))continue;
  const sib=n.nextSibling,prv=n.previousSibling;if((sib&&sib.nodeType===1&&sib.dataset&&sib.dataset.sup)||(prv&&prv.nodeType===1&&prv.dataset&&prv.dataset.sup))continue;
  for(const m of t.matchAll(re))bad.push(where+': "'+m[0]+'" in "'+t.trim().slice(0,70)+'"');}
 return bad;},tok.source,tok.flags,where);
const geom=()=>pg.evaluate(()=>{const r=document.querySelector('#drop-root > div').getBoundingClientRect();const card=document.querySelector('.drop-card');const inner=card.firstElementChild;
 return {h:Math.round(r.height),cardOver:inner.scrollHeight-card.clientHeight,overflowX:document.documentElement.scrollWidth-innerWidth};});
// 1. circles + height + overflow, every beat.
const heights=new Set();
for(let c=0;c<NB.length;c++){await step(c);for(let k=0;k<NB[c];k++){fails.push(...await scan(`step ${c+1} beat ${k+1}`));const g=await geom();heights.add(g.h);if(g.cardOver>0)F(`step ${c+1} beat ${k+1}: text overflows its card by ${g.cardOver}px`);if(g.overflowX>0)F(`step ${c+1} beat ${k+1}: sideways overflow ${g.overflowX}px`);if(k<NB[c]-1)await cont();}}
if(heights.size!==1)F('page height changes between beats: '+[...heights].join(','));
await step(0);await pg.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Helps to know')).click());await S(300);fails.push(...await scan('helps to know'));
await pg.evaluate(()=>document.getElementById('drop-settings-tutorial').click());await S(800);
for(let i=0;i<16;i++){fails.push(...await scan('tutorial '+(i+1)));await pg.evaluate(()=>[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Next'||b.textContent==='Done').click());await S(700);}
await pg.reload();await S(700);
for(const W of [320,360,390]){await pg.setViewport({width:W,height:800,isMobile:true,hasTouch:true});await pg.reload();await S(600);
 for(const c of [0,NB.length-1]){await step(c);const g=await geom();if(g.overflowX>0)F(`${W}px step ${c+1} sideways overflow`);if(g.cardOver>0)F(`${W}px step ${c+1} card overflow ${g.cardOver}`);
  const clip=await pg.evaluate(()=>[...document.querySelectorAll('[role=radiogroup] button')].filter(b=>b.scrollWidth>b.clientWidth+1).map(b=>b.textContent));if(clip.length)F(`${W}px clipped tabs: ${clip}`);
  const nclip=await pg.evaluate(()=>[...document.querySelectorAll('nav[aria-label="Lesson steps"] button')].filter(b=>b.children[1].scrollWidth>b.children[1].clientWidth).map(b=>b.textContent));if(nclip.length)F(`${W}px clipped step chips: ${nclip}`);}}
await pg.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
// 2. labels in all 12 keys; one note at a time. Voices are numbered by chord tone: 0 root, 1 third, 2 fifth, 3 seventh or sixth.
const dots=()=>pg.evaluate(()=>[...document.querySelectorAll('#drop-board g[data-voice]')].map(g=>({v:+g.dataset.voice,s:+g.dataset.s,f:+g.dataset.f,label:g.querySelector('text:not([data-alt])').textContent,alt:(g.querySelector('text[data-alt]')||{}).textContent||'',halo:!!g.querySelector('.drop-halo'),fill:g.querySelector('circle[data-dot]').style.fill,op:+g.querySelector('circle[data-dot]').style.opacity})));
const setShow=v=>pg.evaluate(v=>[...document.querySelectorAll('#drop-show button')].find(b=>b.textContent===v).click(),v).then(()=>S(120));
const at=async(c,beat)=>{await pg.evaluate((c,b)=>{location.hash='#s'+c+'b'+(b+1)},c,beat);await S(160);return (await dots()).sort((a,c)=>a.v-c.v);};
const Qs={dim7:[[0,0],[2,3],[4,6],[6,9]],mid:[[0,0],[2,3],[4,7],[6,9]],m6:[[0,0],[2,3],[4,7],[5,9]],six:[[0,0],[2,4],[4,7],[5,9]],maj7:[[0,0],[2,4],[4,7],[6,11]],dom7:[[0,0],[2,4],[4,7],[6,10]],m7:[[0,0],[2,3],[4,7],[6,10]],hdim:[[0,0],[2,3],[4,6],[6,10]]};
const IVN={dim7:['R','\u266d3','\u266d5','\u266d\u266d7'],m6:['R','\u266d3','5','6'],six:['R','3','5','6']};
const RED='rgb(232, 55, 42)';
const names=(k,id)=>Qs[id].map(([ls,sm])=>sp(k,ls,sm));
const moved=(a,c)=>a.map((d,i)=>d.s!==c[i].s||d.f!==c[i].f?i:-1).filter(i=>i>=0);
const eq=(a,b,w)=>{if(JSON.stringify(a)!==JSON.stringify(b))F(w+' got '+JSON.stringify(a)+' want '+JSON.stringify(b));};
await step(4+OFF);await pg.click('button[aria-label="Display settings"]');await S(400);
for(const k of KEYS){await pg.select('#drop-key',k.id);await S(200);
 await setShow('Names');
 // Learn opens in root position: after Explore with another inversion, after choosing one inside Learn and coming back, and after a key change.
 {const selInv=()=>pg.evaluate(()=>{const b=document.querySelector('#drop-learninv [aria-checked=true]');return b?b.textContent:null;});
  await step(6+OFF);await pg.evaluate(()=>document.querySelectorAll('#drop-inv button')[3].click());await S(80);
  await step(4+OFF);eq(await selInv(),'Root',k.id+' Learn opens in root position after Explore with 3rd');
  await pg.evaluate(()=>document.querySelectorAll('#drop-learninv button')[1].click());await S(80);eq(await selInv(),'1st',k.id+' the learner\'s choice sticks inside Learn');
  await step(2+OFF);await step(4+OFF);eq(await selInv(),'Root',k.id+' Learn reopens in root position');
  await pg.evaluate(()=>document.querySelectorAll('#drop-learninv button')[3].click());await S(80);await pg.select('#drop-key',k.id==='C'?'D':'C');await S(150);eq(await selInv(),'Root',k.id+' a key change resets Learn to root position');await pg.select('#drop-key',k.id);await S(150);
  await step(6+OFF);const ei=await pg.evaluate(()=>document.querySelector('#drop-inv [aria-checked=true]').textContent);eq(ei,'Root',k.id+' Explore opens in root position');}
 // Step 1: closed, the 5 drops, the 7 steps across, the finished chord.
 const o=[];for(let beat=0;beat<4;beat++)o.push(await at(1,beat));
 const nm=names(k,'maj7');
 o.forEach((d,i)=>eq(d.map(x=>x.label),nm,`${k.id} opening beat ${i+1} names`));
 if(!D3){
 eq(o[0].map(d=>d.s),[2,3,4,5],k.id+' closed strings D G B e'); eq(moved(o[0],o[1]),[2],k.id+' only the 5th moves (beat 2)'); eq(moved(o[1],o[2]),[3],k.id+' only the 7th moves (beat 3)'); eq(moved(o[2],o[3]),[],k.id+' nothing moves (beat 4)');
 eq([o[1][2].s,o[2][3].s],[1,4],k.id+' the 5th lands on the A string, the 7th on the B string');
 if(o[1][2].f!==o[0][2].f-(o[0][2].s===4?0:0)&&false)F('x');
 const pitch=d=>[40,45,50,55,59,64][d.s]+d.f;
 if(pitch(o[1][2])!==pitch(o[0][2])-12)F(k.id+' the 5th did not drop exactly an octave');
 if(pitch(o[2][3])!==pitch(o[1][3]))F(k.id+' the 7th changed pitch when it stepped across');
 if(k.id==='C'){eq(o[0].map(d=>d.f),[10,9,8,7],'C closed D10 G9 B8 e7');eq([o[1][2].f,o[2][3].f],[10,12],'C: 5th on A10, 7th on B12');}
 } else {
  eq(o[0].map(d=>d.s),[2,3,4,5],k.id+' close chord on D G B e'); eq(moved(o[0],o[1]),[1],k.id+' only the 3rd moves (beat 2)'); eq(moved(o[1],o[2]),[0],k.id+' only the root steps across (beat 3)'); eq(moved(o[2],o[3]),[],k.id+' nothing moves (beat 4)');
  eq([o[1][1].s,o[2][0].s],[1,3],k.id+' the 3rd lands on the A string, the root steps to the G string');
  const pitch=d=>[40,45,50,55,59,64][d.s]+d.f;
  if(pitch(o[1][1])!==pitch(o[0][1])-12)F(k.id+' the 3rd did not drop exactly an octave');
  if(pitch(o[2][0])!==pitch(o[1][0]))F(k.id+' the root changed pitch when it stepped across');
  eq(o[3].map(d=>d.s).sort(),[1,3,4,5],k.id+' final strings: bass, one silent string, three neighbours');
  if(k.id==='C'){eq(o[0].map(d=>d.f),[10,9,8,7],'C close chord D10 G9 B8 e7');eq([o[1][1].f,o[2][0].f],[7,5],'C: 3rd on A7, root on G5');}
 }
 o.forEach((d,i)=>{if(d.some(x=>x.halo)!==(i===1||i===2))F(`${k.id} opening beat ${i+1} halo wrong`);});
 if(D3){ // Compare: Drop 2 then Drop 3 on the same string, the same bass note.
  const c1=await at(2,0),c2=await at(2,1);eq(c1.map(d=>d.label),nm,k.id+' compare names');eq(c1.map(d=>d.s).sort(),[1,2,3,4],k.id+' Drop 2 uses four neighbouring strings');eq(c2.map(d=>d.s).sort(),[1,3,4,5],k.id+' Drop 3 skips a string after the bass');
  const lowest=c=>c.reduce((a,x)=>([40,45,50,55,59,64][x.s]+x.f<[40,45,50,55,59,64][a.s]+a.f?x:a));if(lowest(c1).v!==1||lowest(c2).v!==1)F(k.id+' compare: the bass is not the third in both');
 }
 // Step 4: closed then drop for the other qualities.
 for(const [qi,id] of [[0,'dom7'],[3,'m7'],[6,'hdim']]){const tri=[];for(let j=0;j<3;j++)tri.push(await at(4+OFF,qi+j));
  tri.forEach((d,i)=>eq(d.map(x=>x.label),names(k,id),`${k.id} ${id} beat ${i+1} names`));
  eq(moved(tri[0],tri[1]),D3?[1]:[2],`${k.id} ${id} drop moves the dropped note only`);eq(moved(tri[1],tri[2]),D3?[0]:[3],`${k.id} ${id} step moves the stepped note only`);
  eq(tri[0].map(d=>d.s),[2,3,4,5],`${k.id} ${id} closed strings`);}
 // Step 5: learn and practise, in every inversion. Voices are numbered by chord tone, so a moved voice index is the changed note.
 const LP=['maj7','dom7','m7','hdim','dim7','mid','m6','m6','m6','m6','six','six','six','six'];
 const EXPMOVE=[null,[3],[1],[2],[3],[2],[],[],[],[],[1],[],[],[]];
 for(let inv=0;inv<4;inv++){
  await pg.evaluate(o=>{location.hash='#s'+(5+o)+'b1'},OFF);await S(150);await pg.evaluate(i=>document.querySelectorAll('#drop-learninv button')[i].click(),inv);await S(120);
  await setShow('Names');const L=[];for(let beat=0;beat<14;beat++)L.push(await at(5+OFF,beat));
  for(let beat=0;beat<14;beat++){eq(L[beat].map(d=>d.label),names(k,LP[beat]),`${k.id} inv${inv} learn beat ${beat+1} names`);
   L[beat].forEach(d=>{const red=beat===9||beat===12?d.v===3:d.v===0;if((d.fill===RED)!==red)F(`${k.id} inv${inv} beat ${beat+1}: wrong red dot (voice ${d.v})`);});
   if(beat>0){const mv=moved(L[beat-1],L[beat]);eq(mv,EXPMOVE[beat],`${k.id} inv${inv} learn beat ${beat+1} moved voices`);
    mv.forEach(i=>{if(L[beat][i].s!==L[beat-1][i].s||Math.abs(L[beat][i].f-L[beat-1][i].f)!==1)F(`${k.id} inv${inv} beat ${beat+1}: the changed dot must move one fret on its own string`);});
    const haloed=L[beat].map((d,i)=>d.halo?i:-1).filter(i=>i>=0);if(beat===9||beat===12)eq(haloed,[3],`${k.id} beat ${beat+1} marks the other root`);else if(beat===6||beat===7)eq(haloed,[3],'respell ring');else eq(haloed,EXPMOVE[beat],`${k.id} inv${inv} beat ${beat+1} ringed dot`);}}
  // The re-reading beats: both names, and the intervals counted from the 6th.
  const title8=await pg.evaluate(o=>{location.hash='#s'+(5+o)+'b9';return null},OFF);await S(200);
  for(const [beat,id,relK] of [[9,'m6','hdim'],[12,'six','m7']]){await setShow('Intervals');eq((await at(5+OFF,beat-1)).map(x=>x.label),IVN[id],`${k.id} inv${inv} beat ${beat}: intervals counted from the root`);await setShow('Names');await at(5+OFF,beat);const tt=await pg.evaluate(()=>document.getElementById('drop-name-title').textContent);const rel={pc:(k.pc+9)%12,letter:(k.letter+5)%7};
   const bassTone=[0,1,2,3][inv];const relInv=[1,2,3,0][bassTone];const bn=(root,qd,t)=>sp(root,qd[t][0],qd[t][1]);
   const wantL=N.chordSymbol(k.id.replace('b','\u266d').replace('#','\u266f'),id==='m6'?'m6':'six',inv?N.simpleBass(bn(k,Qs[id],bassTone)):undefined);
   const relQ=Qs[relK];const wantR=N.chordSymbol(sp(rel,0,0),relK==='hdim'?'hdim':'m7',relInv?N.simpleBass(bn(rel,relQ,relInv)):undefined);
   if(tt!==wantR)F(`${k.id} inv${inv} re-reading title '${tt}' want '${wantR}'`);
   await setShow('Intervals');const d=(await dots());d.sort((x,y)=>x.v-y.v);const wi=Qs[relK].map(()=>0);
   const IV={hdim:['R','\u266d3','\u266d5','\u266d7'],m7:['R','\u266d3','5','\u266d7']}[relK];eq(d.map(x=>x.label),[1,2,3,0].map(t=>IV[t]),`${k.id} inv${inv} beat ${beat+1} intervals from the 6th`);await setShow('Names');}
 }
 // The "also" label (the enharmonic beat, 8): inside the board, clear of every dot, in both label modes.
 await pg.evaluate(()=>document.querySelectorAll('#drop-learninv button')[2].click());await S(100);
 for(const mode of ['Names','Intervals']){await setShow(mode);await at(5+OFF,7);await S(450);const bad=await pg.evaluate(()=>{const svg=document.getElementById('drop-board').getBoundingClientRect();const t=document.querySelector('#drop-board text[data-alt]');if(!t)return 'no alt label';const a=t.getBoundingClientRect();const out=[];if(a.left<svg.left||a.right>svg.right||a.top<svg.top||a.bottom>svg.bottom)out.push('alt label leaves the board');
  document.querySelectorAll('#drop-board circle[data-dot]').forEach(c=>{const r=c.getBoundingClientRect();const own=c.closest('g').querySelector('text[data-alt]')===t;if(own)return;if(!(a.right<r.left||a.left>r.right||a.bottom<r.top||a.top>r.bottom))out.push('alt label overlaps a dot');});
  const own=t.closest('g').querySelector('circle[data-dot]').getBoundingClientRect();const gap=a.left>own.right?a.left-own.right:own.left-a.right;if(gap<3)out.push('alt label touches its own dot ('+gap.toFixed(1)+'px)');return out.join('; ');});if(bad)F(`${k.id} ${mode}: ${bad}`);}
 await setShow('Intervals');eq((await at(5+OFF,7))[3].alt,'also \u266d\u266d7',k.id+' enharmonic interval alt');await setShow('Names');eq((await at(5+OFF,7))[3].alt,'also '+sp(k,6,9),k.id+' enharmonic names alt');
 // The ii V i walk (step 6): chord tones, red root, and the ringed dots are exactly the ones that moved.
 await setShow('Names');
 for(const minor of [true,false]){
  await step(5+OFF);await pg.evaluate(m=>[...document.querySelectorAll('#drop-mode button')].find(b=>b.textContent===(m?'Minor':'Major')).click(),minor);await S(120);
  const kinds=minor?['hdim','dom7','m6']:['m7','dom7','maj7'],qid=minor?['hdim','dom7','m6']:['m7','dom7','maj7'];
  const roots=[sp(k,1,2),sp(k,4,7),sp(k,0,0)],rls=[[1,2],[4,7],[0,0]];
  let prev=null;
  for(let beat=0;beat<12;beat++){const c=beat%3;const d=await at(6+OFF,beat);const q=Qs[qid[c]];
   const want=q.map(([ls,sm])=>sp({pc:(k.pc+[2,7,0][c])%12,letter:(k.letter+[1,4,0][c])%7},ls,sm)).sort();
   const got=d.map(x=>x.label).sort();eq(got,want,`${k.id} ${minor?'minor':'major'} walk beat ${beat+1} notes`);
   const nm=await pg.evaluate(()=>document.getElementById('drop-name-title').textContent);const wantStart=N.chordSymbol(roots[c],kinds[c]);if(!nm.startsWith(wantStart))F(`${k.id} walk beat ${beat+1} title '${nm}' want '${wantStart}...'`);
   const redLabels=d.filter(x=>x.fill===RED).map(x=>x.label);eq(redLabels,[roots[c]],`${k.id} walk beat ${beat+1} red root`);
   if(c>0&&prev){const moved=d.map((x,i)=>x.f!==prev[i].f?i:-1).filter(i=>i>=0);const halo=d.map((x,i)=>x.halo?i:-1).filter(i=>i>=0);eq(halo,moved,`${k.id} walk beat ${beat+1} ringed dots vs moved dots`);d.forEach((x,i)=>{if(x.s!==prev[i].s)F('walk dot changed string');});}
   else if(d.some(x=>x.halo))F(`${k.id} walk beat ${beat+1}: ring on the first chord of a round`);
   prev=d;}
 }
 await setShow('Names');
}
await pg.select('#drop-key','C');await S(200);await setShow('Intervals');
// 3. Explore: all chords, string sets, inversions in C; dots ink with a red root; four dots on the board; arrows stop at the ends.
await step(6+OFF);
const ink='rgb(77, 53, 51)';let ex=0;
for(const q of [0,1,2,3,4,5,6])for(const s of (D3?[0,1]:[0,1,2]))for(const i of [0,1,2,3]){
 await pg.evaluate((q,s,i)=>{const t=sel=>document.querySelectorAll(sel+' button')[0].parentElement;document.querySelectorAll('#drop-quality button')[q].click();document.querySelectorAll('#drop-sets button')[s].click();document.querySelectorAll('#drop-inv button')[i].click();},q,s,i);await S(60);
 const r=await pg.evaluate(()=>{const svg=document.getElementById('drop-board').getBoundingClientRect();const g=[...document.querySelectorAll('#drop-board g[data-voice]')];return g.map(x=>{const c=x.querySelector('circle[data-dot]');const b=c.getBoundingClientRect();return {fill:c.style.fill,label:x.querySelector('text').textContent,in:b.left>=svg.left-1&&b.right<=svg.right+1,op:+c.style.opacity};});});
 const title=await pg.evaluate(()=>document.getElementById('drop-name-title').textContent);const sub=await pg.evaluate(()=>document.getElementById('drop-name-sub').textContent);
 {const KINDS=['maj7','dom7','m7','hdim','dim7','m6','six'];const qd=Qs[['maj7','dom7','m7','hdim','dim7','m6','six'][q]];const ORD=[[0,2,3,1],[1,3,0,2],[2,0,1,3],[3,1,2,0]];const bn=sp(KEYS[0],qd[ORD[i][0]][0],qd[ORD[i][0]][1]);const exp=N.chordSymbol('C',KINDS[q],i?N.simpleBass(bn):undefined);if(title!==exp)F(`explore ${q}/${s}/${i} title '${title}' want '${exp}'`);
  const wantSub=['Root position','1st inversion','2nd inversion','3rd inversion'][i]+' \u00b7 Bass on String '+[6,5,4][s];if(sub!==wantSub)F(`explore subtitle '${sub}' want '${wantSub}'`);}
 if(i===0&&q===0){const tl=await pg.evaluate(()=>[...document.querySelectorAll('#drop-sets button')].map(b=>b.textContent));eq(tl,D3?['Bass on String 6','Bass on String 5']:['Bass on String 6','Bass on String 5','Bass on String 4'],'string tabs');const al=await pg.evaluate(()=>[...document.querySelectorAll('#drop-quality button')].map(b=>b.getAttribute('aria-label')));eq(al,['Cmaj7','C7','Cm7','Cm7\u266d5','Cdim7','Cm6','C6'],'chord tabs have plain aria-labels');const tt=await pg.evaluate(()=>[...document.querySelectorAll('#drop-quality button')].map(b=>b.textContent));eq(tt,['C\uE18A7','C7','C-7','C\uE18F7','C\uE1877','C-6','C6'],'chord tab symbols');}
 ex++;if(r.length!==4)F(`explore ${q}/${s}/${i}: ${r.length} dots`);
 r.forEach(d=>{if(!d.in)F(`explore ${q}/${s}/${i}: a dot is off the board`);if(d.op!==1)F(`explore dim dot`);});
 if(r.filter(d=>d.label==='R').length!==1)F(`explore ${q}/${s}/${i}: no single R`);
 r.forEach(d=>{if(d.label==='R'?d.fill!==RED:d.fill!==ink)F(`explore ${q}/${s}/${i}: dot colour ${d.fill} for ${d.label}`);});}
await S(300);
let steps=0;for(let g=0;g<12&&!(await pg.evaluate(()=>document.querySelector('.drop-arrow[aria-label^="Prev"]').disabled));g++){await pg.click('.drop-arrow[aria-label^="Prev"]');await S(100);}
if(!(await pg.evaluate(()=>document.querySelector('.drop-arrow[aria-label^="Prev"]').disabled)))F('Prev never disabled');
for(let g=0;g<12&&!(await pg.evaluate(()=>document.querySelector('.drop-arrow[aria-label^="Next"]').disabled));g++){await pg.click('.drop-arrow[aria-label^="Next"]');await S(100);steps++;}
if(steps<1)F('Explore has only one place for the chord');
// 4. Share makes a PNG (no native share in headless: it downloads); the subtitle line is drawn in it: on Explore (a subtitle) the image is taller than on a step whose beat has none... both have subtitles here, so compare against a forced empty one.
const shareH=async()=>{return pg.evaluate(async()=>{window.__sh=null;navigator.canShare=()=>true;navigator.share=async d=>{window.__sh=d;};document.getElementById('drop-share-quick').click();for(let i=0;i<40&&!window.__sh;i++)await new Promise(r=>setTimeout(r,100));if(!window.__sh)return null;const f=window.__sh.files[0];const u=new Uint8Array(await f.arrayBuffer());const dv=new DataView(u.buffer);return {size:f.size,name:f.name,type:f.type,w:dv.getUint32(16),h:dv.getUint32(20),title:window.__sh.title};});};
const withSub=await shareH();
const png=withSub?withSub.size:0;
if(!withSub||withSub.size<5000)F('share produced no PNG');else if(withSub.w!==1080)F('share width '+withSub.w);else if(withSub.title!==undefined)F('share sheet got a title field');else if(!/^[a-z0-9-]+\.png$/.test(withSub.name))F('share file name not ascii-safe: '+withSub.name);
else{ // the subtitle adds a header line: 176 vs 120 px (the header is part of the image height)
 const bh=(1080-160)*(await pg.evaluate(()=>{const v=document.getElementById('drop-board').viewBox.baseVal;return v.height/v.width;}));const expH=Math.round(80+176+bh+80);if(Math.abs(withSub.h-expH)>2)F(`share height ${withSub.h}, want ${expH} (title + subtitle + diagram)`);}
console.log(`explore combos ${ex}, share png ${png} bytes, heights ${[...heights]}`);
console.log(fails.length?fails.slice(0,40).join('\n'):'ok');console.log('fails',fails.length);
await b.close();site.close();process.exit(fails.length?1:0);})();
