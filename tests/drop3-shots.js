// Screenshots of the Drop 3 lesson's opening and compare beats at 390px into renders/drop3/.
const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(site.url('lessons/drop-3-chords/index.html'));await S(900);
for(const h of ['#s1b1','#s1b2','#s1b3','#s1b4','#s2b1','#s2b2']){await pg.evaluate(h=>{location.hash=h},h);await S(900);await pg.screenshot({path:`../renders/drop3/${h.slice(1)}.png`,clip:{x:0,y:100,width:390,height:600}});}
await b.close();site.close();})();
