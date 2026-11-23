const p=require('puppeteer-core');const fs=require('fs');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();
await pg.setViewport({width:390,height:760,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(site.url('lessons/dominant-pentatonics/index.html#s8'));await S(900);
await pg.evaluate(()=>{navigator.canShare=()=>true;navigator.share=async d=>{window.__shared=d;};});
const setKey=async k=>{await pg.evaluate(()=>document.querySelector('button[aria-label="Display settings"]').click());await S(350);
 await pg.evaluate(k=>{const sel=document.querySelector('#nine-settings select');const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(sel,k);sel.dispatchEvent(new Event('change',{bubbles:true}));},k);await S(300);
 await pg.evaluate(()=>document.querySelector('button[aria-label="Display settings"]').click());await S(400);};
const layer=async l=>{await pg.evaluate(l=>[...document.querySelectorAll('.nine-card button')].find(b=>b.textContent===l).click(),l);await S(300);};
const label=async l=>{await pg.evaluate(l=>[...document.querySelectorAll('#nine-labels button')].find(b=>b.textContent===l).click(),l);await S(300);};
const shot=async n=>{const r=await pg.evaluate(()=>{const e=document.getElementById('nine-name').getBoundingClientRect();return {x:0,y:e.top-4,width:390,height:e.height+8};});await pg.screenshot({path:n,clip:r});};
await layer('Arpeggio');await shot('name_c.png');
await label('Gm6');await layer('Drop 2');await shot('name_gm6.png');
await setKey('Bb');await label('C9'.replace('C','B♭')==='x'?'':'B♭9'.slice(0,0)+(await pg.evaluate(()=>document.querySelector('#nine-labels button:nth-child(2)').textContent)));await shot('name_bb.png');
await pg.evaluate(()=>document.getElementById('nine-share-quick').click());await S(1500);
const r=await pg.evaluate(async()=>{const d=window.__shared;if(!d)return null;const f=d.files[0];const buf=new Uint8Array(await f.arrayBuffer());let s='';for(const x of buf)s+=String.fromCharCode(x);return {n:f.name,b64:btoa(s),t:d.title};});
if(r){fs.writeFileSync('share_bb.png',Buffer.from(r.b64,'base64'));console.log('shared',r.n,r.t);}
await b.close();site.close();})();
