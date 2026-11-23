// The share button hands a PNG to the native share sheet: only the bold chord name and the diagram.
const p=require('puppeteer-core');const fs=require('fs');const N=require('./notation');const G6=N.chordSymbol('G','m6');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(900);
await pg.evaluate(()=>{navigator.canShare=()=>true;navigator.share=async d=>{window.__shared=d;};});
await pg.evaluate(()=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[7].click());await S(600);
await pg.evaluate(()=>[...document.querySelectorAll('.nine-card button')].find(b=>b.textContent==='Drop 2').click());await S(300);
await pg.evaluate(G=>[...document.querySelectorAll('#nine-labels button')].find(b=>b.textContent.includes(G)).click(),G6);await S(300);
await pg.evaluate(()=>document.getElementById('nine-share-quick').click());await S(1500);
const r=await pg.evaluate(async()=>{const d=window.__shared;if(!d)return null;const f=d.files[0];const buf=new Uint8Array(await f.arrayBuffer());let s='';for(const x of buf)s+=String.fromCharCode(x);return {name:f.name,type:f.type,title:d.title,b64:btoa(s)};});
if(!r){console.log('FAIL: no share call');}else{fs.writeFileSync(process.argv[2]||'share.png',Buffer.from(r.b64,'base64'));console.log('shared',r.name,r.type,'title:',r.title);}
// The subtitle line (\"Drop 2\") is drawn in the image: the PNG is 56px taller with it than on a layer that has none (Arpeggio).
const dims=b64=>{const u=Buffer.from(b64,'base64');return {w:u.readUInt32BE(16),h:u.readUInt32BE(20)};};
const withSub=dims(r.b64);
await pg.evaluate(()=>{window.__shared=null;[...document.querySelectorAll('.nine-card button')].find(b=>b.textContent==='Arpeggio').click();});await S(300);
await pg.evaluate(()=>document.getElementById('nine-share-quick').click());await S(1500);
const r2=await pg.evaluate(async()=>{const d=window.__shared;if(!d)return null;const f=d.files[0];const buf=new Uint8Array(await f.arrayBuffer());let s='';for(const x of buf)s+=String.fromCharCode(x);return {name:f.name,b64:btoa(s)};});
if(!r2)console.log('FAIL: no second share');else{const no=dims(r2.b64);const ok=withSub.h-no.h===56;console.log(ok?'ok':'FAIL','subtitle adds',withSub.h-no.h,'px (Drop 2 '+withSub.h+' vs Arpeggio '+no.h+')','file names',r.name,r2.name);}
await b.close();site.close();})();
