const p=require('puppeteer-core');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.setViewport({width:390,height:844});await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await new Promise(r=>setTimeout(r,1000));
const res=await pg.evaluate(async()=>{
 const S=t=>new Promise(r=>setTimeout(r,t));const OP=[4,9,2,7,11,4];
 const LET=['C','D','E','F','G','A','B'],NAT=[0,2,4,5,7,9,11],ST={0:0,2:1,4:2,5:3,7:4,9:5,10:6};
 const NOTE={0:'C',2:'D',4:'E',5:'F',7:'G',9:'A',10:'Bb'};
 const iv=(d,r)=>{const ls=(ST[d]-ST[r]+7)%7,se=(d-r+12)%12,df=((se-NAT[ls]+18)%12)-6;const pre=df<0?'b'.repeat(-df):'#'.repeat(df);if(ls===1&&df===0)return '9';return pre+(ls===1?9:ls+1);};
 const btns=sel=>[...document.querySelectorAll(sel)];
 const click=(sel,t)=>{const x=btns(sel).find(b=>b.textContent.trim()===t);if(!x)throw new Error('no '+t+' in '+sel);x.click();};
 const goCard=async c=>{btns('nav[aria-label="Lesson steps"] button')[c].click();await S(60);const cur=btns('nav button').findIndex(x=>x.getAttribute('aria-current')==='step');if(cur!==c)throw new Error('nav '+c+' got '+cur);};
 let cases=0,fails=[],dots=0,legChecks=0,nameChecks=0;
 const FR=[['C9',0],['Eø',4],['Gm6',7]];
 for(let c=0;c<8;c++){
  await goCard(c);
  if(c<=6){ // guided steps: walk every beat, check each lit and dimmed dot's label, the red root, and the bold chord name
   const NB=[3,3,4,3,3,6,3][c];
   for(let bi=0;bi<NB;bi++){
    if(bi>0){ document.querySelector('.nine-btn-primary').click(); await S(80); }
    for(const mode of ['Intervals','Notes']){
     click('#nine-show button',mode); await S(40);
     const vis=[...document.querySelectorAll('#nine-board g[data-vis="1"]')];
     const isRed=g=>/(b42318|180, 35, 24)/i.test(g.querySelector('circle').style.getPropertyValue('fill'));
     const redEl=vis.find(isRed);
     const r=redEl?(OP[+redEl.dataset.s]+ +redEl.dataset.f)%12:0;
     let lit=0;
     for(const g of vis){
      const s=+g.dataset.s,f=+g.dataset.f,d=(OP[s]+f)%12,lab=g.querySelector('text').textContent;dots++;
      if(parseFloat(g.querySelector('circle').style.opacity||'1')>0.5)lit++;
      const exp=mode==='Notes'?NOTE[d]:(d===r?'R':iv(d,r));
      if(lab!==exp||isRed(g)!==(d===r))fails.push(`guided card${c+1} beat${bi+1} ${mode}: s${s}f${f} got '${lab}' red=${isRed(g)} want '${exp}'`);
     }
     if(lit<1)fails.push(`guided card${c+1} beat${bi+1}: nothing lit`);
     const nm=document.getElementById('nine-name').textContent.trim();
     if(!nm)fails.push(`guided card${c+1} beat${bi+1}: no chord name`);
     if(!document.querySelector('.nine-card h2').textContent.trim())fails.push(`guided card${c+1}: no heading`);
     cases++;
    }
   }
   continue;
  }
  const toggles = c===6 ? [[null,'Drop 2'],[null,'Drop 3']] : c===7 ? ['Arpeggio','Pentatonic','Mixolydian','Drop 2','Drop 3'].map(l=>[null,l]) : [[null,null]];
  for(const [em,tg] of toggles){ if(em){click('.nine-card button',em);await S(30);} if(tg) {click('.nine-card button',tg);await S(30);}
   for(const shp of (c<=3?[null]:['1','2','3','4','5'])){ if(shp){click('[aria-label="Shape"] button','Shape'+shp); await S(30);}
   for(const mode of ['Intervals','Notes']){ click('#nine-show button',mode); await S(20);
    for(const [fl,fr] of FR){
     if(c===3) click('.nine-card button',fl); else click('#nine-settings button',fl);
     await S(40);
     const quiz=false;
     if(quiz){ for(const g of document.querySelectorAll('#nine-board g[data-vis="1"]')) if(!g.querySelector('text').textContent){ g.dispatchEvent(new MouseEvent('click',{bubbles:true})); await S(8);} await S(40);}
     const r = fr; cases++;
     if(shp){const sp=document.getElementById('nine-shape'); if(sp.dataset.p!==shp) fails.push('shape pick '+shp+' got '+sp.dataset.p);}
     for(const g of document.querySelectorAll('#nine-board g[data-vis="1"]')){
      const s=+g.dataset.s,f=+g.dataset.f,d=(OP[s]+f)%12, lab=g.querySelector('text').textContent; dots++;
      const exp = mode==='Notes'? NOTE[d] : (d===r?'R':iv(d,r));
      const red = /(b42318|180, 35, 24)/i.test(g.querySelector('circle').style.getPropertyValue('fill'));
      const FOC=[[0,4,7,10],[4,7,10],[4,7,10,2],[4,7,10,2]][c];
      if(FOC){const dim=parseFloat(g.querySelector('circle').style.opacity||'1')<0.5; if(dim===FOC.includes(d)) fails.push(`dimming card${c+1} ${mode} ${fl}: s${s}f${f} dim=${dim}`);}
      if(lab!==exp || red!==(d===r)) fails.push(`card${c+1} ${em} ${tg} sh${shp} ${mode} ${fl}: s${s}f${f} got '${lab}' red=${red} want '${exp}'`);
     }
     const BASE={0:'C9',4:'Eø',7:'Gm6'}[r];
     const leg=document.querySelector('.nine-card').nextElementSibling.textContent;
     const rootShown=[...document.querySelectorAll('#nine-board g[data-vis="1"]')].some(g=>(OP[+g.dataset.s]+ +g.dataset.f)%12===r);
     legChecks++;
     if(!quiz && rootShown && c!==1 && c!==2 && !leg.includes('R = root ('+NOTE[r]+')')) fails.push(`legend card${c+1} ${em} ${tg} ${mode} ${fl}: ${leg}`);
     if(c===6){ nameChecks++; const h2=document.querySelector('.nine-card h2').textContent; if(!new RegExp(BASE+'( no root|/[A-G]b?)?$').test(h2)) fails.push(`name card6 ${tg} ${fl}: ${h2}`);}
     if(c===7&&!quiz&&(tg==='Drop 2'||tg==='Drop 3')){ nameChecks++; if(!new RegExp(tg+' · '+BASE+'( no root|/[A-G]b?)?').test(leg)) fails.push(`legend name ${tg} ${fl}: ${leg}`);}
     const gl=[...document.querySelectorAll('#nine-settings [role=radiogroup]')][0].querySelector('[aria-checked=true]').textContent;
     if(gl!==fl) fails.push(`global frame card${c+1} shows ${gl} want ${fl}`);
    }}}}
 }
 return {cases,dots,legChecks,nameChecks,failCount:fails.length,fails:fails.slice(0,10)};});
console.log(JSON.stringify(res,null,1));
await b.close();site.close();})();
