// Screenshots of every beat of the Drop 2 lesson at 390px (into renders/drop2/), plus the page height of each (it must not change).
const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(site.url('lessons/drop-2-chords/index.html'));await S(900);
const nb=[4,3,4,9,6,3,1];const hs=[];
for(let c=0;c<7;c++){await pg.evaluate(c=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[c].click(),c);await S(500);
 for(let k=0;k<nb[c];k++){await S(650);hs.push(await pg.evaluate(()=>document.documentElement.scrollHeight));await pg.screenshot({path:`../renders/drop2/s${c+1}b${k+1}.png`});
  if(k<nb[c]-1){await pg.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Continue')).click());await S(300);}}}
console.log('heights',[...new Set(hs)].join(','));await b.close();site.close();})();
