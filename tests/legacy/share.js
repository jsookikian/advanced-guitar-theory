const p=require('puppeteer-core');const fs=require('fs');(async()=>{const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));
const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));pg.on('console',m=>console.log('console',m.text()));
const cdp=await pg.target().createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:require('path').resolve(__dirname,'dl')});
await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../../index.html')).href);await S(800);
const go=async c=>{for(let i=0;i<c;i++){await pg.keyboard.press('ArrowRight');await S(40);}await S(900);};
const clickIn=(sel,t)=>pg.evaluate((sel,t)=>[...document.querySelectorAll(sel)].find(x=>x.textContent===t).click(),sel,t);
await go(7); // card 8 = Shape 2
await clickIn('.nine-card button','Pentatonic');await S(900);
await pg.click('[aria-label="Share this diagram as an image"]');await S(2500);
console.log(fs.readdirSync('dl'));
await go(1); await clickIn('.nine-card button','Drop 3');
await pg.click('.nine-icon[aria-label="Display settings"]');await S(400);await clickIn('#nine-settings button','Notes');await S(900);
await pg.click('[aria-label="Share this diagram as an image"]');await S(2500);
console.log(fs.readdirSync('dl'));
for(const W of [320,390]){await pg.setViewport({width:W,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});await S(500);
 console.log(W, await pg.evaluate(()=>{const d=document.documentElement;const el=document.querySelector('[aria-label="Share this diagram as an image"]'),r=el.getBoundingClientRect();return `scrollWidth ${Math.max(d.scrollWidth,document.body.scrollWidth)} clientWidth ${d.clientWidth}; share btn x ${Math.round(r.left)}-${Math.round(r.right)}; legend row h ${Math.round(el.parentElement.getBoundingClientRect().height)}`}));}
await pg.screenshot({path:'lesson_390_sharebtn.png'});
await b.close();})();
