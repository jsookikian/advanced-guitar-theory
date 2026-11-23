const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(900);
await pg.screenshot({path:'help_closed.png'});
await pg.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Helps to know')).click());await S(400);
await pg.screenshot({path:'help_open.png'});
await pg.goto(site.url('index.html'));await S(500);await pg.screenshot({path:'catalog.png'});
await b.close();site.close();})();
