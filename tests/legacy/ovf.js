const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));
for(const W of [320,360,390,430]){const pg=await b.newPage();await pg.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);await pg.setViewport({width:W,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await pg.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../../src/index.html')).href);await S(800);
 const out=[];let worst=0, offenders=new Set();
 for(const open of [false,true]){ if(open){await pg.click('.nine-icon');await S(400);}
  for(let c=0;c<14;c++){ if(c>0){await pg.keyboard.press('ArrowRight');} await S(420);
   const r=await pg.evaluate(()=>{const d=document.documentElement,bd=document.body;const vw=d.clientWidth;const bad=[...document.querySelectorAll('#nine-root *')].filter(e=>e.getBoundingClientRect().right>vw+0.5||e.getBoundingClientRect().left<-0.5).slice(0,3).map(e=>e.tagName+'.'+(e.className.baseVal??e.className)+':'+Math.round(e.getBoundingClientRect().right));return {sw:Math.max(d.scrollWidth,bd.scrollWidth),cw:vw,bad};});
   worst=Math.max(worst,r.sw-r.cw); r.bad.forEach(x=>offenders.add(x)); out.push(r.sw===r.cw?1:0);}
  for(let c=0;c<14;c++){await pg.keyboard.press('ArrowLeft');await S(15);} await S(400);}
 console.log(`${W}: ${out.filter(x=>x).length}/${out.length} states scrollWidth==clientWidth (${W}), worst excess ${worst}px`, [...offenders].slice(0,5).join(' '));
 if(W===390){ // renders
  await pg.click('.nine-icon');await S(400); // close
  await pg.evaluate(()=>[...document.querySelectorAll('#nine-settings button')].find(x=>x.textContent==='Notes').click());
  await pg.keyboard.press('ArrowRight');await S(200);await pg.keyboard.press('ArrowRight');await S(400);
  await pg.evaluate(()=>[...document.querySelectorAll('.nine-card button')].find(x=>x.textContent==='Eø').click());await S(900);
  await pg.screenshot({path:'lesson_390_notes_card3.png'});
  for(let i=0;i<6;i++){await pg.keyboard.press('ArrowRight');await S(60);} await S(900);
  console.log('card9:',await pg.evaluate(()=>document.querySelector('.nine-card h2').textContent));
  await pg.screenshot({path:'lesson_390_notes_card9.png'});
  await pg.evaluate(()=>[...document.querySelectorAll('.nine-card button')].find(x=>x.textContent==='Drop 3').click());await S(900);
  console.log('card9 drop3:',await pg.evaluate(()=>document.querySelector('.nine-card h2').textContent));
  await pg.screenshot({path:'lesson_390_card9_drop3.png'});
 }
 await pg.close();}
await b.close();})();
