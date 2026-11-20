const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
const S=t=>new Promise(r=>setTimeout(r,t));
await pg.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);
for(const W of [320,390,1280]){await pg.setViewport({width:W,height:844,deviceScaleFactor:2});await pg.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../lessons/dominant-pentatonics/index.html')).href);await S(700);
 const info=async(sel)=>{const el=await pg.$(sel);await el.hover();await S(200);return pg.evaluate(()=>{const t=document.getElementById('nine-tip');if(!t)return 'NONE';const r=t.getBoundingClientRect();return t.textContent+' ['+Math.round(r.left)+'-'+Math.round(r.right)+' of '+document.documentElement.clientWidth+(r.left<0||r.right>document.documentElement.clientWidth?' OUT':'')+'] bg '+getComputedStyle(t).backgroundColor;});};
 const out=[];
 for(const i of [0,2,6]) out.push(await info(`nav button:nth-child(${i+1})`));
 out.push(await info('.nine-arrow[aria-label^="Prev"]'));out.push(await info('.nine-arrow[aria-label^="Next"]'));
 out.push(await info('.nine-icon[aria-label^="Share"]'));out.push(await info('.nine-icon[aria-label="Display settings"]'));
 out.push(await info('[aria-label="Shape"] button:nth-child(2)'));
 await pg.mouse.move(5,830);await S(150);out.push('after leave: '+await pg.evaluate(()=>!!document.getElementById('nine-tip')));
 console.log(W);out.forEach(x=>console.log('  '+x));
 if(W===390){await pg.hover('nav button:nth-child(3)');await S(200);await pg.screenshot({path:'lesson_390_tooltip.png',clip:{x:0,y:0,width:390,height:200},captureBeyondViewport:false});
  await pg.hover('.nine-arrow[aria-label^="Next"]');await S(200);await pg.screenshot({path:'lesson_390_tooltip_arrow.png',clip:{x:0,y:250,width:390,height:250},captureBeyondViewport:false});}
}
// keyboard focus-visible
await pg.setViewport({width:390,height:844});await pg.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../lessons/dominant-pentatonics/index.html')).href);await S(600);
await pg.keyboard.press('Tab');await S(200);console.log('tab focus:',await pg.evaluate(()=>{const t=document.getElementById('nine-tip');return (document.activeElement.getAttribute('aria-label')||'')+' -> '+(t?t.textContent:'NONE')}));
// click nav step via mouse still navigates, and Continue still works
await pg.click('nav button:nth-child(4)');await S(400);console.log('nav click ->',await pg.evaluate(()=>document.querySelector('.nine-card h2').textContent));
await b.close();})();
