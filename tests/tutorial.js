// The tour: every step's spotlight stays inside the screen, and moving between steps never snaps (no jump bigger than a smooth glide).
const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(800);
await pg.evaluate(()=>document.getElementById('nine-settings-tutorial').click());await S(1000);
const fails=[];const rows=[];
for(let i=1;i<=13;i++){
 const title=await pg.evaluate(()=>document.querySelector('[role=dialog] h2').innerText);
 const info=await pg.evaluate(()=>{const sp=document.querySelector('[role=dialog] > div[aria-hidden][style*="box-shadow"]');if(!sp)return null;const r=sp.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,vw:innerWidth,vh:innerHeight};});
 if(!info)fails.push(`step ${i} ${title}: no spotlight`);else if(info.l<-12||info.r>info.vw+12||info.b<0||info.t>info.vh)fails.push(`step ${i} ${title}: spotlight off screen ${JSON.stringify(info)}`);
 await pg.evaluate(()=>{window.__s=[];const t0=performance.now();const tick=()=>{const sp=document.querySelector('[role=dialog] > div[aria-hidden][style*="box-shadow"]');const r=sp?sp.getBoundingClientRect():null;const cd=document.querySelector('[role=dialog] h2');const c=cd?cd.closest('div[style*="position: fixed"]'):null;const cr=c?c.getBoundingClientRect():null;window.__s.push({t:Math.round(performance.now()-t0),sp:r?[r.left,r.top,r.width,r.height]:null,op:c?+getComputedStyle(c).opacity:null,ct:cr?cr.top:null});if(performance.now()-t0<1100)requestAnimationFrame(tick);};tick();});
 await pg.evaluate(()=>[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Next'||b.textContent==='Done').click());await S(1300);
 const s=await pg.evaluate(()=>window.__s);
 let jump=0;for(let k=1;k<s.length;k++){const a=s[k-1],c=s[k];if(a.sp&&c.sp&&(a.op??1)>0.5&&(c.op??1)>0.5){jump=Math.max(jump,Math.abs(c.sp[0]-a.sp[0]),Math.abs(c.sp[1]-a.sp[1]));}}
 const hidden=s.some(x=>x.sp===null);
 rows.push(`${i} ${title}: maxStep=${Math.round(jump)}px faded=${hidden}`);
 if(jump>90)fails.push(`step ${i} ${title}: spotlight jumped ${Math.round(jump)}px in one frame`);
}
console.log(rows.join('\n'));console.log(fails.length?fails.join('\n'):'ok');console.log('fails',fails.length);
await b.close();site.close();})();
