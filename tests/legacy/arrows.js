const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../../src/index.html')).href);await S(800);
const st=()=>pg.evaluate(()=>{const a=[...document.querySelectorAll('.nine-arrow')];return document.body.innerText.match(/Step \d+/)[0]+' | '+document.getElementById('nine-board').getAttribute('aria-label')+' | '+document.querySelector('.nine-card h2').textContent+' | arrows '+a.map(x=>(x.disabled?'off':'on')+'@'+Math.round(x.getBoundingClientRect().left)+'-'+Math.round(x.getBoundingClientRect().right)+'x'+Math.round(x.getBoundingClientRect().height)).join(' ')});
const R=async()=>{await pg.click('.nine-arrow[aria-label^="Next"]');await S(700);};const L=async()=>{await pg.click('.nine-arrow[aria-label^="Prev"]');await S(700);};
console.log('card1', await st()); await R(); console.log('card1 →', await st());
for(let i=0;i<5;i++){await pg.keyboard.press('ArrowRight');await S(80);} await S(600);
console.log('card6 (kept shape 2)', await st()); await R(); console.log('card6 →', await st());
await pg.keyboard.press('ArrowRight');await S(600);console.log('card7', await st());
await pg.keyboard.press('ArrowRight');await S(600);console.log('card8', await st()); await R(); console.log('card8 →', await st());
await pg.screenshot({path:'lesson_390_arrows.png'});
for(let i=0;i<4;i++){await pg.keyboard.press('ArrowRight');await S(80);} await S(600); console.log('practise', await st()); await R(); console.log('practise →', await st());
for(const W of [320,390]){await pg.setViewport({width:W,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});await S(400);console.log(W,'overflow',await pg.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-document.documentElement.clientWidth));}
await b.close();})();
