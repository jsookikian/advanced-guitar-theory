const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();
const out=[];
for(const W of [320,390]){await pg.setViewport({width:W,height:700,isMobile:true,hasTouch:true});await pg.goto(site.url('lessons/dominant-pentatonics/index.html#s8'));await S(800);
 for(const key of ['C','Db','F#']){await pg.evaluate(k=>{document.querySelector('button[aria-label="Display settings"]').click();},key);await S(400);
  await pg.evaluate(k=>{const sel=document.querySelector('#nine-settings select');const o=[...sel.options].find(x=>x.value===k||x.value===k);const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(sel,o.value);sel.dispatchEvent(new Event('change',{bubbles:true}));},key);await S(300);
  await pg.evaluate(()=>document.querySelector('button[aria-label="Display settings"]').click());await S(400);
  for(const lay of ['Pentatonic','Mixolydian','Arpeggio','Drop 2']){await pg.evaluate(l=>[...document.querySelectorAll('.nine-card button')].find(b=>b.textContent===l).click(),lay);await S(250);
   out.push(W+' '+key+' '+lay+' -> '+JSON.stringify(await pg.evaluate(()=>{const t=document.getElementById('nine-name-title');const r=t.getBoundingClientRect();return {t:t.textContent,h:Math.round(r.height),fs:getComputedStyle(t).fontSize,sub:(document.getElementById('nine-name-sub')||{}).textContent||''};})));}}}
console.log(out.join('\n'));await b.close();site.close();})();
