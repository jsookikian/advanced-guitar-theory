// Screenshot of lesson 1's Explore chord tabs and title (renders/drop2/old_tabs.png).
const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(900);
await pg.evaluate(()=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[7].click());await S(500);
await pg.evaluate(()=>[...document.querySelectorAll('.nine-card button')].find(b=>b.textContent==='Drop 2').click());await S(400);
await pg.evaluate(()=>document.querySelectorAll('#nine-from button')[2].click());await S(600);
await pg.screenshot({path:'../renders/drop2/old_tabs.png',clip:{x:0,y:230,width:390,height:300}});await b.close();site.close();})();
