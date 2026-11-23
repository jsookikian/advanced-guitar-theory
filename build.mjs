// Builds the lesson site. One lesson = one folder:
//   src/lessons/<id>/main.tsx      the lesson's React entry (default-exports its App)
//   lessons/<id>/lesson.json       { title, summary, level, order } for the catalog and the page <title>
// Output (committed, because a Forma Managed space serves files as they are):
//   lessons/<id>/app.js + index.html, and the catalog at index.html.
import { build } from "esbuild";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const dev = process.argv.includes("--dev");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ids = readdirSync("src/lessons", { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(`src/lessons/${d.name}/main.tsx`)).map((d) => d.name);

const metas = Object.fromEntries(ids.map((id) => [id, JSON.parse(readFileSync(`lessons/${id}/lesson.json`, "utf8"))]));
// "Helps to know": lesson.json lists helpful (not required) background as { topic, why, lesson? }. A topic links to its lesson once
// that lesson exists; until then it reads "coming soon".
const helpful = (meta) => (meta.helpful ?? []).map((h) => ({ topic: h.topic, why: h.why, href: h.lesson && metas[h.lesson] ? `lessons/${h.lesson}/index.html` : null }));
const lessons = [];
for (const id of ids) {
  const meta = metas[id];
  await build({
    entryPoints: [`src/lessons/${id}/main.tsx`],
    bundle: true,
    minify: !dev,
    outfile: `lessons/${id}/app.js`,
    jsx: "automatic",
    alias: { "grok/canvas": "./src/shared/grok-canvas-shim.ts" },
    define: { "process.env.NODE_ENV": dev ? '"development"' : '"production"', __HELPFUL__: JSON.stringify(helpful(meta)) },
    logLevel: "warning",
  });
  writeFileSync(`lessons/${id}/index.html`, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="only light">
<link rel="icon" href="data:,">
<title>${esc(meta.title)}</title>
</head>
<body style="margin:0;background:#fdfcfb">
<div id="root"></div>
<script>(function(){var m=/^(.*\\/)lessons\\//.exec(location.pathname),r=m?m[1]:"/",s=document.createElement("script");s.src=r+"lessons/${id}/app.js";document.body.appendChild(s)})()</script>
</body>
</html>
`);
  lessons.push({ id, ...meta });
}
lessons.sort((a, b) => a.order - b.order);

const items = lessons.map((l) => `    <li><a href="lessons/${l.id}/index.html"><span class="lvl">${esc(l.level)}</span><span class="ttl">${esc(l.title)}</span><span class="sum">${esc(l.summary)}</span>${l.helpful?.length ? `<span class="help">Helps to know: ${esc(l.helpful.map((h) => h.topic).join(", "))}</span>` : ""}</a></li>`).join("\n");
writeFileSync("index.html", `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="only light">
<link rel="icon" href="data:,">
<title>Advanced Guitar Theory</title>
<style>
:root{color-scheme:only light}
body{margin:0;background:#fdfcfb;color:#4d3533;font-family:'KMR Melange Grotesk',-apple-system,'Helvetica Neue',Arial,sans-serif}
main{max-width:640px;margin:0 auto;padding:12px 16px 32px}
h1{font-family:Aime,Georgia,serif;font-weight:400;font-size:22px;line-height:26px;letter-spacing:-.5px;margin:0}
.lede{font-size:14px;line-height:20px;font-weight:350;color:#806a68;margin:4px 0 16px}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
a{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border:1px solid #dcd5d4;border-radius:12px;color:inherit;text-decoration:none;transition:border-color 150ms ease}
a:hover{border-color:#4d3533}
a:focus-visible{outline:2px solid #0f766e;outline-offset:2px}
.lvl{font-size:11.5px;font-weight:600;letter-spacing:.02em;color:#0f766e}
.ttl{font-family:Aime,Georgia,serif;font-size:21px;line-height:26px;letter-spacing:-.4px}
.sum{font-size:14px;line-height:20px;font-weight:350;color:#806a68}
.help{font-size:12.5px;line-height:18px;font-weight:350;color:#806a68;border-top:1px solid #eee9e8;padding-top:6px;margin-top:2px}
.credit{font-size:11.5px;line-height:16px;color:#806a68;margin:24px 0 0}
</style>
</head>
<body>
<main>
  <h1>Advanced Guitar Theory</h1>
  <p class="lede">Short, interactive fretboard lessons.</p>
  <ul>
${items}
  </ul>
  <p class="credit">Guitar sounds: FluidR3 GM soundfont by Frank Wen (CC BY 3.0), as packaged by gleitz/midi-js-soundfonts.</p>
</main>
</body>
</html>
`);
console.log(`built ${lessons.length} lesson(s): ${lessons.map((l) => l.id).join(", ")}`);
