const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();
for(const W of [320,390]){await pg.setViewport({width:W,height:700,deviceScaleFactor:2,isMobile:true,hasTouch:true});await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(800);
await pg.evaluate(()=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[7].click());await S(600);
const st=()=>pg.evaluate(()=>{const e=document.getElementById('nine-shape');const o=[...document.querySelectorAll('.nine-oct')].map(b=>b.textContent+(b.disabled?'(off)':''));return {lo:e.dataset.lo,p:e.dataset.p,oct:o,ovf:document.documentElement.scrollWidth-document.documentElement.clientWidth};});
const r=[await st()];
await pg.evaluate(()=>document.querySelector('.nine-oct[aria-label="Up an octave"]').click());await S(500);r.push(await st());
await pg.evaluate(()=>document.querySelector('.nine-oct[aria-label="Down an octave"]').click());await S(500);r.push(await st());
console.log(W,JSON.stringify(r));await pg.screenshot({path:`oct_${W}.png`});}
await b.close();site.close();})();
