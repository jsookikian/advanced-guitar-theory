// Screenshots of the respelling beats (double flat) in several keys, plus the ii V i walk, into renders/drop2/.
const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(site.url('lessons/drop-2-chords/index.html'));await S(900);
await pg.evaluate(()=>{location.hash='#s5b1'});await S(300);await pg.click('button[aria-label="Display settings"]');await S(400);
for(const [k,nm] of [['C','C'],['Db','Db'],['Fsharp','F#'],['B','B']]){await pg.select('#drop-key',nm);await S(200);
 for(const bt of [3,4]){await pg.evaluate(bt=>{location.hash='#s5b'+bt},bt);await S(900);await pg.screenshot({path:`../renders/drop2/respell_${k}_${bt}.png`,clip:{x:0,y:120,width:390,height:560}});}}
await b.close();site.close();})();
