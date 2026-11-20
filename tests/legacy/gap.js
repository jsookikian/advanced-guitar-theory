const p=require('puppeteer-core');const fs=require('fs');(async()=>{const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));
for(const W of [320,390]){const pg=await b.newPage();const cdp=await pg.target().createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:require('path').resolve(__dirname,'dl')});
await pg.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);await pg.setViewport({width:W,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../../index.html')).href);await S(900);
const tops=[],ovf=[];
for(let c=0;c<14;c++){ if(c) {await pg.keyboard.press('ArrowRight');} await S(450);
 const r=await pg.evaluate(()=>{const d=document.documentElement;const bd=document.getElementById('nine-board');
  const dots=[...bd.querySelectorAll('g[data-vis="1"][data-s="0"] circle')].map(c=>c.getBoundingClientRect().bottom);
  const nums=[...bd.querySelectorAll('text')].filter(t=>!t.closest('g[data-s]')&&t.getAttribute('font-size')==='11'&&/^\d+$/.test(t.textContent)&&t.getBoundingClientRect().width>0).map(t=>t.getBoundingClientRect().top);
  const svgB=bd.getBoundingClientRect().bottom, numB=Math.max(...[...bd.querySelectorAll('text')].filter(t=>/^\d+$/.test(t.textContent)).map(t=>t.getBoundingClientRect().bottom).filter(x=>x<5000));
  return {top:Math.round(bd.getBoundingClientRect().top),gap:dots.length?Math.min(...nums)-Math.max(...dots):null,clip:svgB-numB,sw:Math.max(d.scrollWidth,document.body.scrollWidth)-d.clientWidth};});
 tops.push(r.top);ovf.push(r.sw); if(c===0) console.log(W,'gap dot→numbers',r.gap?.toFixed(1),'px; space below numbers',r.clip.toFixed(1));
 if(W===390&&c===7){await S(500);await pg.screenshot({path:'lesson_390_fretgap.png'});await pg.click('[aria-label="Share this diagram as an image"]');await S(2500);}
}
console.log(W,'board tops',[...new Set(tops)].join(','),'(practise card differs by design)','max overflow',Math.max(...ovf));
await pg.close();}
console.log(fs.readdirSync('dl'));await b.close();})();
