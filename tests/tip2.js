const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox','--window-size=390,844'],headless:'new',defaultViewport:null});const pg=(await b.pages())[0];
const S=t=>new Promise(r=>setTimeout(r,t));
await pg.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../index.html')).href);await S(700);
const cdp=await pg.createCDPSession();
const shot=async(f)=>{const {data}=await cdp.send('Page.captureScreenshot',{format:'png'});require('fs').writeFileSync(f,Buffer.from(data,'base64'));};
await pg.hover('nav button:nth-child(3)');await S(250);console.log(await pg.evaluate(()=>!!document.getElementById('nine-tip')));await shot('lesson_390_tooltip.png');
await pg.hover('.nine-arrow[aria-label^="Next"]');await S(250);await shot('lesson_390_tooltip_arrow.png');
await b.close();})();
