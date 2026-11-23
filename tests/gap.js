const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();
for(const [W,mode] of [[390,'Pentatonic'],[390,'Drop 2'],[320,'Pentatonic']]){await pg.setViewport({width:W,height:700,isMobile:true,hasTouch:true});await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(700);
await pg.evaluate(()=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[7].click());await S(500);
await pg.evaluate(m=>[...document.querySelectorAll('.nine-card button')].find(b=>b.textContent===m).click(),mode);await S(300);
console.log(W,mode,JSON.stringify(await pg.evaluate(()=>{const R=e=>e.getBoundingClientRect();const sh=R(document.getElementById('nine-shape'));const t=R(document.getElementById('nine-name-title'));const sub=document.getElementById('nine-name-sub');const sb=sub?R(sub):null;const bd=R(document.getElementById('nine-board'));const first=[...document.querySelectorAll('#nine-board g[data-vis="1"] circle')].map(c=>R(c).top).sort((a,b)=>a-b)[0];const nm=R(document.getElementById('nine-name'));
return {aboveGap:Math.round(t.top-sh.bottom),belowToSvg:Math.round(bd.top-(sb?sb.bottom:t.bottom)),belowToFirstDot:Math.round(first-(sb?sb.bottom:t.bottom)),nameH:Math.round(nm.height)};})));}
await b.close();site.close();})();
