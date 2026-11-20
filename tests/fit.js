const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});const pg=await b.newPage();
for(const W of [320,360,390]){await pg.setViewport({width:W,height:800,isMobile:true,hasTouch:true});await pg.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../src/index.html')).href);await new Promise(r=>setTimeout(r,700));
console.log(W,JSON.stringify(await pg.evaluate(()=>[...document.querySelectorAll('nav[aria-label="Lesson steps"] button')].map(x=>{const s=x.children[1];return s.textContent+':'+(s.scrollWidth>s.clientWidth?'CLIP':'ok')+':h'+Math.round(x.getBoundingClientRect().height)}))),
 await pg.evaluate(()=>{const s=document.getElementById('nine-shape');return 'shape '+(s.scrollWidth>s.clientWidth?'ellipsed':'fits')}));}
await b.close();})();
