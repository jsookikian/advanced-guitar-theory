// The site's chord-name function (src/shared/notation.tsx), loaded for the tests, so they assert names through the same code the pages use.
const esbuild = require('esbuild'), path = require('path');
const out = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/shared/notation.tsx')], bundle: true, format: 'cjs', write: false, jsx: 'automatic', alias: { 'grok/canvas': path.resolve(__dirname, '../src/shared/grok-canvas-shim.ts') } });
const m = { exports: {} }; new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
module.exports = m.exports;
