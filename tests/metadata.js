// Link-preview metadata: every page (the catalog and each lesson) has the full Open Graph and Twitter set with absolute https URLs, a real
// favicon, and a share card that exists, is 1200x630 and small. Titles, descriptions and images are not duplicated across pages.
const fs = require('fs'), path = require('path'); const root = path.resolve(__dirname, '..');
const pages = [{ id: 'catalog', file: 'index.html' }].concat(fs.readdirSync(path.join(root, 'lessons')).filter(id => fs.existsSync(path.join(root, 'lessons', id, 'index.html'))).map(id => ({ id, file: `lessons/${id}/index.html` })));
let fails = 0; const F = m => { fails++; console.log('FAIL', m); };
const get = (html, attr, name) => { const m = new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`).exec(html); return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"') : null; };
const seen = { title: new Map(), desc: new Map(), image: new Map() };
for (const pg of pages) {
  const html = fs.readFileSync(path.join(root, pg.file), 'utf8');
  const need = { 'og:title': 'property', 'og:description': 'property', 'og:type': 'property', 'og:url': 'property', 'og:site_name': 'property', 'og:image': 'property', 'og:image:width': 'property', 'og:image:height': 'property', 'og:image:alt': 'property', 'twitter:card': 'name', 'twitter:title': 'name', 'twitter:description': 'name', 'twitter:image': 'name', description: 'name' };
  const v = {}; for (const [n, a] of Object.entries(need)) { v[n] = get(html, a, n); if (!v[n]) F(`${pg.id}: missing ${n}`); }
  if (v['og:type'] !== 'website') F(`${pg.id}: og:type ${v['og:type']}`);
  if (v['twitter:card'] !== 'summary_large_image') F(`${pg.id}: twitter:card ${v['twitter:card']}`);
  for (const n of ['og:url', 'og:image', 'twitter:image']) if (v[n] && !/^https:\/\/[^/]+\//.test(v[n])) F(`${pg.id}: ${n} is not an absolute https URL: ${v[n]}`);
  if (v['og:image'] !== v['twitter:image']) F(`${pg.id}: og:image and twitter:image differ`);
  if (v['og:title'] !== v['twitter:title'] || v['og:description'] !== v['twitter:description']) F(`${pg.id}: og and twitter text differ`);
  if (v['og:image:width'] !== '1200' || v['og:image:height'] !== '630') F(`${pg.id}: declared size ${v['og:image:width']}x${v['og:image:height']}`);
  if (!/<link rel="icon" type="image\/svg\+xml" href="https:\/\/[^"]+favicon\.svg">/.test(html)) F(`${pg.id}: no absolute favicon link`);
  if (html.includes('href="data:,"')) F(`${pg.id}: still the empty favicon`);
  // the image URL maps back to a file in the repo (everything after the site URL's path), whatever SITE_URL is
  const rel = v['og:image'] && v['og:image'].replace(/^https:\/\/[^/]+(\/advanced-guitar-theory)?\//, '');
  const imgFile = path.join(root, rel || 'missing');
  if (!rel || !fs.existsSync(imgFile)) F(`${pg.id}: og:image file ${rel} does not exist`);
  else { const b = fs.readFileSync(imgFile); if (b.readUInt32BE(0) !== 0x89504e47) F(`${pg.id}: not a PNG`); const w = b.readUInt32BE(16), h = b.readUInt32BE(20); if (w !== 1200 || h !== 630) F(`${pg.id}: image is ${w}x${h}`); if (b.length > 300 * 1024) F(`${pg.id}: image is ${b.length} bytes`); console.log(pg.id.padEnd(22), `${w}x${h}`, b.length, 'bytes', v['og:url']); }
  if (!/^\s*\S/.test(v['og:title'] || '') || !/^\s*\S/.test(v['og:description'] || '')) F(`${pg.id}: empty title or description`);
  for (const [k, val] of [['title', v['og:title']], ['desc', v['og:description']], ['image', v['og:image']]]) { if (seen[k].has(val)) F(`${pg.id}: ${k} duplicates ${seen[k].get(val)}`); seen[k].set(val, pg.id); }
}
if (!fs.existsSync(path.join(root, 'favicon.svg'))) F('favicon.svg is missing');
console.log(fails ? '' : 'ok', 'fails', fails); process.exit(fails ? 1 : 0);
