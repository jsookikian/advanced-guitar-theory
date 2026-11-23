// Rule: every note name and interval in the lesson's text is a circle (roots red). Walks every beat, the Explore card, the
// "Helps to know" list and every tutorial step, and fails on any note or interval left as plain text.
// What counts as one is src/shared/tokens.json. Exempt: chord and scale names (bold, headings, the name under the board),
// the board's own SVG, the step chips, and form controls (the Key select cannot hold a circle).
const p=require('puppeteer-core');const tok=require('../src/shared/tokens.json');
(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.setViewport({width:390,height:844});await pg.goto(site.url('lessons/dominant-pentatonics/index.html'));await S(900);
const scan=where=>pg.evaluate((src,flags,where)=>{
 const re=new RegExp(src,flags);const ex='.nine-note,[data-pip],strong,h1,h2,#nine-name,svg,nav,select,option,label,style,script,a,button[aria-pressed],#nine-settings,#nine-tip';
 const bad=[];const w=document.createTreeWalker(document.getElementById('nine-root'),NodeFilter.SHOW_TEXT);let n;
 while((n=w.nextNode())){const t=n.nodeValue;if(!t.trim()||n.parentElement.closest(ex))continue;
  // A chord name set in pieces (C, raised 9; G, raised m6, / E): its letter sits beside a raised span, and is part of the chord name.
  const sib=n.nextSibling,prv=n.previousSibling;if((sib&&sib.nodeType===1&&sib.dataset&&sib.dataset.sup)||(prv&&prv.nodeType===1&&prv.dataset&&prv.dataset.sup))continue;
  // [x] is a deliberate circle only when it was rendered as one; a literal bracket left in text is a bug too.
  for(const m of t.matchAll(re))bad.push(where+': "'+m[0]+'" in "'+t.trim().slice(0,70)+'"');}
 return bad;},tok.source,tok.flags,where);
const fails=[];const click=t=>pg.evaluate(t=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(t)).click(),t);
const cards=8;
for(let c=0;c<cards;c++){await pg.evaluate(c=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[c].click(),c);await S(450);
 const nb=[3,2,4,3,3,6,3,1][c];
 for(let k=0;k<nb;k++){fails.push(...await scan('card '+(c+1)+' beat '+(k+1)));if(k<nb-1){await click('Continue');await S(450);}}}
await pg.evaluate(()=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[0].click());await S(450);
await click('Helps to know');await S(300);fails.push(...await scan('helps to know'));
await pg.evaluate(()=>document.getElementById('nine-tutorial').click());await S(800);
for(let i=0;i<13;i++){fails.push(...await scan('tutorial '+(i+1)));await pg.evaluate(()=>[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Next'||b.textContent==='Done').click());await S(700);}
console.log(fails.length?fails.join('\n'):'ok');console.log('fails',fails.length);
await b.close();site.close();})();
