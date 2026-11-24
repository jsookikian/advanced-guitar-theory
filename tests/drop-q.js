// helper for walk.js: the engine's Q() quality, loaded the same way
const esbuild = require('esbuild'), path = require('path');
const out = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/shared/drop/theory.ts')], bundle: true, format: 'cjs', write: false, alias: { 'grok/canvas': path.resolve(__dirname, '../src/shared/grok-canvas-shim.ts') } });
const m = { exports: {} }; new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
module.exports = id => m.exports.Q(id);
