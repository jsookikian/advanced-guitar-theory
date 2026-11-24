// Screenshots of every step and beat of the sus-chords lesson into renders/sus/ (390px wide), plus console errors.
const p=require('puppeteer-core'),fs=require('fs');(async()=>{const site=await require('./site').start();const b=await p.launch({executablePath:process.env.CHROME,args:['--no-sandbox'],headless:'new'});
const S=t=>new Promise(r=>setTimeout(r,t));const pg=await b.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));pg.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
const W=+process.env.W||390;await pg.setViewport({width:W,height:844,deviceScaleFactor:2});fs.mkdirSync('../renders/sus',{recursive:true});
const only=process.env.ONLY?process.env.ONLY.split(','):null;
const counts=[8,4,3,10,6,5,1];
for(let c=0;c<7;c++)for(let k=0;k<counts[c];k++){const tag=`s${c+1}b${k+1}`;if(only&&!only.includes(tag))continue;
 await pg.goto(site.url('lessons/sus-chords/index.html')+`#${tag}`);await pg.reload();await S(700);
 await pg.screenshot({path:`../renders/sus/${W}-${tag}.png`});}
console.log('done');await b.close();site.close();})();
