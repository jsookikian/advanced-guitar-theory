const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);
const vp=W=>pg.setViewport({width:W,height:844,deviceScaleFactor:2,isMobile:W<600,hasTouch:W<600});
await vp(390);await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(900);
const go=async c=>{await pg.evaluate(c=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[c].click(),c);await S(500);};
const clickT=async(sel,t)=>{await pg.evaluate((sel,t)=>[...document.querySelectorAll(sel)].find(b=>b.textContent.trim()===t).click(),sel,t);await S(450);};
const m=()=>pg.evaluate(()=>{const c=document.querySelector('.nine-card');const bd=document.getElementById('nine-board').getBoundingClientRect();
 return {boardTop:Math.round(bd.top),cardOver:c.scrollHeight-c.clientHeight,ovf:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-document.documentElement.clientWidth,bottom:Math.round(document.querySelector('.nine-btn-primary').getBoundingClientRect().bottom)}});
await pg.screenshot({path:'lesson_390_new_card1.png'});
for(const W of [320,390,1280]){await vp(W);await S(300);const rows=[];
 for(let c=0;c<8;c++){await go(c);
  if(c===7){rows.push([c+1,'Explore',JSON.stringify(await m())]);}
  else rows.push([c+1,'',JSON.stringify(await m())]);}
 await pg.evaluate(()=>document.querySelector('.nine-icon[aria-label="Display settings"]').click());await S(400);
 rows.push(['settings open','',JSON.stringify(await m())]);
 await pg.evaluate(()=>document.querySelector('.nine-icon[aria-label="Display settings"]').click());await S(400);
 console.log(W);rows.forEach(r=>console.log(' ',r.join(' ')));}
await vp(390);await S(300);
await go(7);await clickT('.nine-card button','Pentatonic');
await pg.screenshot({path:'lesson_390_new_explore.png'});
await b.close();site.close();})();
