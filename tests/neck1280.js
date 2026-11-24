const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();
await pg.setViewport({width:1280,height:900});await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(800);
await pg.evaluate(()=>document.getElementById('nine-settings-tutorial').click());await S(900);
for(let i=0;i<9;i++){await pg.evaluate(()=>[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Next').click());await S(900);}
console.log(await pg.evaluate(()=>document.querySelector('[role=dialog] h2').innerText));
await pg.screenshot({path:'neck1280.png'});await b.close();site.close();})();
