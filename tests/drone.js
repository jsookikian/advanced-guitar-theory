// The Settings drone button starts and stops a low root note, survives Hear it, and follows the key.
const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.setViewport({width:390,height:844});await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(700);const fails=[];const F=m=>{fails.push(m);console.log('FAIL',m);};
await pg.click('button[aria-label="Display settings"]');await S(500);
const txt=()=>pg.$eval('#nine-drone',e=>e.textContent+'|'+e.getAttribute('aria-pressed'));
let t=await txt();if(!/Drone on C/.test(t)||!/false/.test(t))F('initial '+t);
await pg.click('#nine-drone');await S(400);t=await txt();if(!/■ Drone on C/.test(t)||!/true/.test(t))F('on '+t);
await pg.click('#nine-hear');await S(300);await pg.click('#nine-hear');await S(300);t=await txt();if(!/true/.test(t))F('drone survived Hear it: '+t);
await pg.select('select:not(#nine-sound)','G');await S(400);t=await txt();if(!/Drone on G/.test(t)||!/true/.test(t))F('key follow '+t);
await pg.click('#nine-drone');await S(300);t=await txt();if(!/▶ Drone on G/.test(t)||!/false/.test(t))F('off '+t);
await pg.screenshot({path:'drone.png'});
console.log(fails.length?'FAILED':'drone ok');await b.close();site.close();})();
