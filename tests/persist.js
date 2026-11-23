// Refreshing (or opening a link) comes back to the same step and part.
const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.setViewport({width:390,height:844});const url=site.url('lessons/dominant-pentatonics/index.html');const fails=[];
const where=()=>pg.evaluate(()=>({h:location.hash,cur:[...document.querySelectorAll('nav[aria-label="Lesson steps"] button')].findIndex(x=>x.getAttribute('aria-current')==='step'),title:document.querySelector('.nine-card h2').textContent}));
await pg.goto(url);await S(700);
await pg.evaluate(()=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[5].click());await S(500);
await pg.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Continue')).click());await S(500);
const before=await where();
await pg.reload();await S(900);const after=await where();
if(after.cur!==before.cur||after.title!==before.title||after.h!==before.h)fails.push('reload lost the spot: '+JSON.stringify({before,after}));
await pg.goto(url+'#s8');await S(700);const ex=await where();if(ex.cur!==7)fails.push('#s8 should open Explore, got '+JSON.stringify(ex));
await pg.goto(url+'#s99b9');await S(700);const bad=await where();if(bad.cur!==0)fails.push('bad hash should open step 1, got '+JSON.stringify(bad));
console.log(JSON.stringify({before,after}));console.log(fails.length?fails.join('\n'):'ok');console.log('fails',fails.length);
await b.close();site.close();})();
