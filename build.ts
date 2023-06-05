/* eslint-disable no-console */

import esbuild from 'esbuild';
import pkg from './package.json' assert { type: 'json' };

const external = Object.keys(pkg.dependencies);

// Node CJS bundle
const out1 = await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  platform: 'node',
  target: ['node12'],
  external,
  bundle: true,
  sourcemap: true,
  minify: true,
  metafile: true && process.stdout.isTTY,
  logLevel: 'debug',
});

// Node ESM bundle
const out2 = await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.mjs',
  platform: 'node',
  format: 'esm',
  target: ['node16'],
  external,
  bundle: true,
  sourcemap: true,
  minify: true,
  metafile: true && process.stdout.isTTY,
  logLevel: 'debug',
});

if (out1.metafile) console.log(await esbuild.analyzeMetafile(out1.metafile));
if (out2.metafile) console.log(await esbuild.analyzeMetafile(out2.metafile));
