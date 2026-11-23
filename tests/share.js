// The share button hands a PNG to the native share sheet: only the bold chord name and the diagram.
const p=require('puppeteer-core');const fs=require('fs');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(900);
await pg.evaluate(()=>{navigator.canShare=()=>true;navigator.share=async d=>{window.__shared=d;};});
await pg.evaluate(()=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[7].click());await S(600);
await pg.evaluate(()=>[...document.querySelectorAll('.nine-card button')].find(b=>b.textContent==='Drop 2').click());await S(300);
await pg.evaluate(()=>[...document.querySelectorAll('#nine-labels button')].find(b=>b.textContent.includes('Gm6')).click());await S(300);
await pg.evaluate(()=>document.getElementById('nine-share-quick').click());await S(1500);
const r=await pg.evaluate(async()=>{const d=window.__shared;if(!d)return null;const f=d.files[0];const buf=new Uint8Array(await f.arrayBuffer());let s='';for(const x of buf)s+=String.fromCharCode(x);return {name:f.name,type:f.type,title:d.title,b64:btoa(s)};});
if(!r){console.log('FAIL: no share call');}else{fs.writeFileSync(process.argv[2]||'share.png',Buffer.from(r.b64,'base64'));console.log('shared',r.name,r.type,'title:',r.title);}
await b.close();site.close();})();
