const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(800);
const st=()=>pg.evaluate(()=>{const sp=document.getElementById('nine-shape');const m=[0,+sp.dataset.p,+sp.dataset.lo,+sp.dataset.hi];
 const svg=document.getElementById('nine-board');const wl=+svg.getAttribute('aria-label').match(/\d+/)[0];
 const vis=[...svg.querySelectorAll('g[data-vis="1"]')].map(g=>+g.dataset.f);
 if(!svg.__id) svg.__id=Math.random();
 return {p:m[1],lo:m[2],hi:m[3],wl,vmin:Math.min(...vis),vmax:Math.max(...vis),nv:vis.length,sid:svg.__id,txt:'Shape '+m[1]+' '+sp.textContent}});
await pg.evaluate(()=>[...document.querySelectorAll('nav[aria-label="Lesson steps"] button')][7].click());await S(300);await pg.click('.nine-icon[aria-label="Display settings"]');await S(400);
let fails=0;const F=m=>{fails++;console.log('FAIL',m)};const summary=[];
for(const key of (process.env.KEYS||'C,Db,D,Eb,E,F,F#,G,Ab,A,Bb,B').split(',')){
 const ok=await pg.evaluate(k=>{const s=document.querySelector('select');const o=[...s.options].find(o=>o.value===k);return !!o},key); if(!ok){F('no key '+key);continue;}
 await pg.select('select',key);await S(500);
 // The arrows stop at the ends: walk down to the lowest copy (Prev disabled there), then up to the highest (Next disabled there).
 const dis=sel=>pg.evaluate(q=>document.querySelector(q).disabled,sel);
 for(let g=0;g<20&&!(await dis('.nine-arrow[aria-label^="Prev"]'));g++){await pg.click('.nine-arrow[aria-label^="Prev"]');await S(120);}
 if(!(await dis('.nine-arrow[aria-label^="Prev"]')))F(key+' Prev never disabled at the nut');
 const list=[];let s=await st();const first=s;
 for(let i=0;i<20;i++){list.push(s);if(await dis('.nine-arrow[aria-label^="Next"]'))break;await pg.click('.nine-arrow[aria-label^="Next"]');await S(160);const n=await st();
  if(n.lo<s.lo)F(key+' stepped backwards '+n.txt);
  if(n.sid!==s.sid)F(key+' remount on normal step');
  s=n;}
 if(!(await dis('.nine-arrow[aria-label^="Next"]')))F(key+' Next never disabled at the top');
 // Octave: tapping the selected Shape button and the 8va button both move the same shape up 12 frets, and from the highest copy back to the lowest, with a remount.
 for(const how of ['up','tap','down']){
  for(let sh=1;sh<=5;sh++){
   const L=list.filter(q=>q.p===sh);if(L.length<2)continue;
   await pg.evaluate(n=>[...document.querySelectorAll('[aria-label="Shape"] button')][n-1].click(),sh);await S(200);
   let c=await st();
   // go to this shape's lowest copy first
   for(let g=0;g<4&&c.lo!==L[0].lo;g++){await pg.evaluate(()=>document.getElementById('nine-octave-up').click());await S(120);c=await st();}
   for(let i=1;i<=L.length;i++){
    const before=c;
    if(how==='up')await pg.evaluate(()=>document.getElementById('nine-octave-up').click());
    else if(how==='down')await pg.evaluate(()=>document.getElementById('nine-octave-down').click());
    else await pg.evaluate(n=>[...document.querySelectorAll('[aria-label="Shape"] button')][n-1].click(),sh);
    await S(160);c=await st();
    const want=how==='down'?L[(L.length-i)%L.length]:L[i%L.length];
    if(c.p!==sh||c.lo!==want.lo)F(key+' '+how+' shape '+sh+' step '+i+' went to '+c.txt+' wanted '+want.lo);
    if(c.sid===before.sid)F(key+' '+how+' no remount');
   }
  }
 }
 await pg.evaluate(()=>[...document.querySelectorAll('[aria-label="Shape"] button')][0].click());await S(200);
 // checks
 const pc={C:0,Db:1,D:2,Eb:3,E:4,F:5,Gb:6,'F#':6,G:7,Ab:8,A:9,Bb:10,B:11}[key];
 list.forEach((q,i)=>{ if(q.lo<0||q.hi>24)F(key+' range '+q.txt); if(i&&q.lo<list[i-1].lo)F(key+' order');
  if(q.vmin<q.lo||q.vmax>q.hi)F(key+' dots outside '+q.txt+' '+q.vmin+'-'+q.vmax);
  if(q.vmin<q.wl||q.vmax>q.wl+6)F(key+' dots off window '+q.txt+' wl'+q.wl);
  if(q.nv<6)F(key+' few dots '+q.txt);});
 for(let sh=1;sh<=5;sh++){const L=list.filter(q=>q.p===sh);if(!L.length){F(key+' missing shape '+sh);continue;}
  for(let i=1;i<L.length;i++)if(L[i].lo-L[i-1].lo!==12)F(key+' shape '+sh+' gap');
  if(L[0].lo-12>=0)F(key+' shape '+sh+' missing lower');if(L[L.length-1].hi+12<=24)F(key+' shape '+sh+' missing higher');}
 // shapes chain: top of one = bottom of next in sequence order by shape p (consecutive in list)
 summary.push(key+': '+list.length+' ['+list.map(q=>q.p+'@'+q.lo+'-'+q.hi).join(' ')+']');
}
console.log(summary.join('\n'));console.log('fails',fails);await b.close();site.close();})();
