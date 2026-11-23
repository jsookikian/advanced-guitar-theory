const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();
for(const W of [320,390]){await pg.setViewport({width:W,height:700,deviceScaleFactor:2,isMobile:true,hasTouch:true});await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(800);
await pg.evaluate(()=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[7].click());await S(600);
await pg.evaluate(()=>[...document.querySelectorAll('.nine-card button')].find(b=>b.textContent==='Mixolydian').click());await S(300);
await pg.screenshot({path:`explore_${W}.png`});}
await b.close();site.close();})();
