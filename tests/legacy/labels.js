const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.setViewport({width:390,height:844});await pg.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../../src/index.html')).href);await new Promise(r=>setTimeout(r,1000));
const res=await pg.evaluate(async()=>{
 const S=t=>new Promise(r=>setTimeout(r,t));const OP=[4,9,2,7,11,4];
 const LET=['C','D','E','F','G','A','B'],NAT=[0,2,4,5,7,9,11],ST={0:0,2:1,4:2,5:3,7:4,9:5,10:6};
 const NOTE={0:'C',2:'D',4:'E',5:'F',7:'G',9:'A',10:'Bb'};
 const iv=(d,r)=>{const ls=(ST[d]-ST[r]+7)%7,se=(d-r+12)%12,df=((se-NAT[ls]+18)%12)-6;const pre=df<0?'b'.repeat(-df):'#'.repeat(df);if(ls===1&&df===0)return '9';return pre+(ls+1);};
 const btns=sel=>[...document.querySelectorAll(sel)];
 const click=(sel,t)=>{const x=btns(sel).find(b=>b.textContent.trim()===t);if(!x)throw new Error('no '+t+' in '+sel);x.click();};
 const goCard=async c=>{for(let i=0;i<15;i++){window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft'}));await S(12);}for(let i=0;i<c;i++){window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}));await S(12);}await S(40);const t=document.body.innerText.match(/Step (\d+) of/);if(+t[1]!==c+1)throw new Error('nav '+c+' got '+t[1]);};
 let cases=0,fails=[],dots=0,legChecks=0,nameChecks=0;
 const FR=[['C9',0],['Eø',4],['Gm6',7]];
 for(let c=0;c<14;c++){
  await goCard(c);
  const toggles = c>=7&&c<=11 ? ['Arpeggio','Pentatonic','Mixolydian','Drop 2','Drop 3'] : c>=12 ? ['1','2','3','4','5','1 8va'] : [null];
  for(const tg of toggles){ if(tg) {click('.nine-card button',tg);await S(30);}
   for(const mode of ['Intervals','Notes']){ click('#nine-settings button',mode); await S(20);
    for(const [fl,fr] of FR){
     if(c===2) click('.nine-card button',fl); else click('#nine-settings button',fl);
     await S(40);
     if(c===13){ for(const g of document.querySelectorAll('#nine-board g[data-vis="1"]')) if(!g.querySelector('text').textContent){ g.dispatchEvent(new MouseEvent('click',{bubbles:true})); await S(8);} await S(40);}
     const r = fr;
     cases++; let bad=0;
     for(const g of document.querySelectorAll('#nine-board g[data-vis="1"]')){
      const s=+g.dataset.s,f=+g.dataset.f,d=(OP[s]+f)%12, lab=g.querySelector('text').textContent; dots++;
      const exp = mode==='Notes'? NOTE[d] : (d===r?'R':iv(d,r));
      const red = /(b42318|180, 35, 24)/i.test(g.querySelector('circle').style.getPropertyValue('fill'));
      if(lab!==exp || red!==(d===r)) {bad++; fails.push(`card${c+1} ${tg} ${mode} ${fl}: s${s}f${f} got '${lab}' red=${red} want '${exp}'`);}
     }
     const BASE={0:'C9',4:'Eø',7:'Gm6'}[r];
     const leg=document.querySelector('.nine-card').nextElementSibling.textContent;
     const rootShown=[...document.querySelectorAll('#nine-board g[data-vis="1"]')].some(g=>(OP[+g.dataset.s]+ +g.dataset.f)%12===r);
     legChecks++;
     if(c!==13 && rootShown && !leg.includes('R = root ('+NOTE[r]+')')) fails.push(`legend card${c+1} ${tg} ${mode} ${fl}: ${leg}`);
     const h2=document.querySelector('.nine-card h2').textContent;
     if(c===5||c===6||tg==='Drop 2'||tg==='Drop 3'){ nameChecks++; if(!new RegExp(BASE+'(/[A-G]b?)?$').test(h2)) fails.push(`name card${c+1} ${tg} ${fl}: ${h2}`);}
     const gl=[...document.querySelectorAll('#nine-settings [role=radiogroup]')][1].querySelector('[aria-checked=true]').textContent;
     if(gl!==fl) fails.push(`global frame card${c+1} shows ${gl} want ${fl}`);
    }}}
 }
 return {cases,dots,legChecks,nameChecks,failCount:fails.length,fails:fails.slice(0,10)};});
console.log(JSON.stringify(res,null,1));
await b.close();})();
