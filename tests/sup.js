const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();
await pg.setViewport({width:390,height:780,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(site.url('lessons/dominant-pentatonics/index.html#s4b3'));await S(900);await pg.reload();await S(900);
await pg.screenshot({path:'sup_guided.png',clip:{x:0,y:90,width:390,height:330}});
await pg.goto(site.url('lessons/dominant-pentatonics/index.html#s8'));await S(500);await pg.reload();await S(900);
await pg.evaluate(()=>[...document.querySelectorAll('.nine-card button')].find(b=>b.textContent==='Arpeggio').click());await S(300);
await pg.screenshot({path:'sup_explore.png',clip:{x:0,y:130,width:390,height:300}});
await b.close();site.close();})();
