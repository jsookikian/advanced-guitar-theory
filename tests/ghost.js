const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();
await pg.setViewport({width:390,height:760,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(site.url('lessons/dominant-pentatonics/index.html#s8'));await S(900);
for(const [l,n] of [['Arpeggio','ghost_arp.png'],['Drop 2','ghost_drop2.png']]){await pg.evaluate(l=>[...document.querySelectorAll('.nine-card button')].find(b=>b.textContent===l).click(),l);await S(400);await pg.screenshot({path:n,clip:{x:0,y:230,width:390,height:420}});}
await pg.goto(site.url('lessons/dominant-pentatonics/index.html#s2b2'));await S(900);await pg.reload();await S(900);await pg.screenshot({path:'ghost_lose.png',clip:{x:0,y:130,width:390,height:520}});
await b.close();site.close();})();
