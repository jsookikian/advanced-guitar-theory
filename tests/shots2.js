const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);
const vp=W=>pg.setViewport({width:W,height:844,deviceScaleFactor:2,isMobile:W<600,hasTouch:W<600});
await vp(390);await pg.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../index.html')).href);await S(900);
const go=async c=>{await pg.evaluate(c=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[c].click(),c);await S(500);};
const clickT=async(sel,t)=>{await pg.evaluate((sel,t)=>[...document.querySelectorAll(sel)].find(b=>b.textContent.trim()===t).click(),sel,t);await S(450);};
const m=()=>pg.evaluate(()=>{const c=document.querySelector('.nine-card');const bd=document.getElementById('nine-board').getBoundingClientRect();
 return {boardTop:Math.round(bd.top),cardOver:c.scrollHeight-c.clientHeight,ovf:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-document.documentElement.clientWidth,bottom:Math.round(document.querySelector('.nine-btn-primary').getBoundingClientRect().bottom)}});
await pg.screenshot({path:'lesson_390_new_card1.png'});
for(const W of [320,390,1280]){await vp(W);await S(300);const rows=[];
 for(let c=0;c<7;c++){await go(c);
  if(c===5){for(const t of ['Drop 2','Drop 3']){await clickT('.nine-card button',t);rows.push([c+1,t,JSON.stringify(await m())]);}}
  else if(c===6){for(const t of ['Explore','Practise','Quiz']){await clickT('.nine-card button',t);rows.push([c+1,t,JSON.stringify(await m())]);}}
  else rows.push([c+1,'',JSON.stringify(await m())]);}
 await pg.evaluate(()=>document.querySelector('.nine-icon[aria-label="Display settings"]').click());await S(400);
 rows.push(['settings open','',JSON.stringify(await m())]);
 await pg.evaluate(()=>document.querySelector('.nine-icon[aria-label="Display settings"]').click());await S(400);
 console.log(W);rows.forEach(r=>console.log(' ',r.join(' ')));}
await vp(390);await S(300);
await go(6);await clickT('.nine-card button','Explore');await clickT('.nine-card button','Pentatonic');
await pg.screenshot({path:'lesson_390_new_explore.png'});
// wrap: from home go Prev until wrapped to the top, then Next wraps back to the nut
const sh=()=>pg.evaluate(()=>{const s=document.getElementById('nine-shape');return s.dataset.p+'@'+s.dataset.lo+'-'+s.dataset.hi;});
await clickT('.nine-card button','Arpeggio');
let prev=await sh();for(let i=0;i<12;i++){await pg.evaluate(()=>document.querySelector('.nine-arrow[aria-label^="Prev"]').click());await S(120);const n=await sh();if(+n.split('@')[1].split('-')[0]>+prev.split('@')[1].split('-')[0]){console.log('wrapped left to',n);prev=n;break;}prev=n;}
await S(700);await pg.evaluate(()=>document.querySelector('.nine-arrow[aria-label^="Next"]').click());await S(700);
console.log('wrapped right to',await sh());
await pg.screenshot({path:'lesson_390_wrap.png'});
await b.close();})();
