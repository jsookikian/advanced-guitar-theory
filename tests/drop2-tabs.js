// Screenshots of the Explore chord tabs (each selected in turn) and the share PNG, into renders/drop2/.
const p=require('puppeteer-core');const fs=require('fs');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(site.url('lessons/drop-2-chords/index.html'));await S(900);
await pg.evaluate(()=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[6].click());await S(600);
await pg.evaluate(()=>document.querySelectorAll('#drop-inv button')[2].click());await S(300);
for(const q of [0,3,4,2]){await pg.evaluate(q=>document.querySelectorAll('#drop-quality button')[q].click(),q);await S(700);await pg.screenshot({path:`../renders/drop2/tabs_${q}.png`,clip:{x:0,y:230,width:390,height:300}});}
await pg.evaluate(()=>{window.__png=null;navigator.canShare=()=>true;navigator.share=async d=>{window.__png=d.files[0];};document.getElementById('drop-share-quick').click();});await S(2500);
const b64=await pg.evaluate(async()=>{if(!window.__png)return null;const u=new Uint8Array(await window.__png.arrayBuffer());let s='';for(const x of u)s+=String.fromCharCode(x);return btoa(s);});
if(b64)fs.writeFileSync('../renders/drop2/share_new.png',Buffer.from(b64,'base64'));console.log(b64?'png saved':'no png');await b.close();site.close();})();
