const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();
for(const W of [320,360,390,1280]){await pg.setViewport({width:W,height:700,deviceScaleFactor:2,isMobile:W<600,hasTouch:W<600});await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(800);
await pg.evaluate(()=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[7].click());await S(600);
const m=await pg.evaluate(()=>[...document.querySelectorAll('#nine-labels button')].map(b=>({t:b.textContent,w:Math.round(b.getBoundingClientRect().width),sw:b.scrollWidth,cw:b.clientWidth,h:Math.round(b.getBoundingClientRect().height)})));
console.log(W,JSON.stringify(m));await pg.screenshot({path:`e_${W}.png`,clip:{x:0,y:0,width:Math.min(W,640),height:330}});}
await b.close();site.close();})();
