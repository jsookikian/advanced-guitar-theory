// The site works under a subpath too (a GitHub Pages project site: /advanced-guitar-theory/), not only at a domain root.
const http=require('http'),fs=require('fs'),path=require('path'),p=require('puppeteer-core');
const ROOT=path.resolve(__dirname,'..'),PRE='/advanced-guitar-theory/';
const TYPES={'.html':'text/html','.js':'text/javascript','.otf':'font/otf','.png':'image/png','.json':'application/json','.txt':'text/plain'};
(async()=>{const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(!u.startsWith(PRE)){r.writeHead(404);return r.end('outside prefix '+u);}
 let f=path.join(ROOT,u.slice(PRE.length));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end('nf');}
 r.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(0);
const base=`http://127.0.0.1:${srv.address().port}${PRE}`;
const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});const pg=await b.newPage();const bad=[];
pg.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url())});pg.on('pageerror',e=>bad.push('ERR '+e.message));
const S=t=>new Promise(r=>setTimeout(r,t));await pg.setViewport({width:390,height:780});
const g=await pg.goto(base);await S(500);
await pg.evaluate(()=>document.querySelector('a[href*="lessons/"]').click());await S(1500);
const fails=[];const info=await pg.evaluate(async()=>{await document.fonts.ready;return {path:location.pathname,card:!!document.querySelector('.nine-card'),home:document.querySelector('a[href]:not([href^="#"])')&&[...document.querySelectorAll('#nine-root a')].map(a=>a.getAttribute('href'))};});
if(!info.card)fails.push('lesson did not render under the subpath: '+JSON.stringify(info));
if(!info.home.includes(PRE))fails.push('All lessons link is not under the prefix: '+JSON.stringify(info.home));
await pg.evaluate(()=>document.querySelectorAll('nav[aria-label="Lesson steps"] button')[7].click());await S(700);
const font=await pg.evaluate(async()=>{await document.fonts.load('400 32px "MuseJazz Text"','C♭');return [...document.fonts].filter(f=>f.status==='loaded'&&f.family.includes('MuseJazz')).length;});
if(font<1)fails.push('MuseJazz font did not load under the subpath');
await pg.evaluate(()=>document.getElementById('nine-tutorial')&&0);
await pg.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.id==='nine-play').click());await S(2500);
bad.forEach(x=>fails.push('request failed: '+x));
console.log(JSON.stringify(info),'fonts loaded:',font);console.log(fails.length?fails.join('\n'):'ok');console.log('fails',fails.length);
await b.close();srv.close();})();
