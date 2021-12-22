/* eslint-disable no-plusplus */

import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { minifyTemplates, writeFiles } from '../dist';
import { createTempDir, deleteTempDir, getTempDir } from './utils';

let count = 0;

test.before(createTempDir);
test.after(deleteTempDir);

// TODO: Test incremental builds and watch mode

test('build runs without error', async () => {
  const dir = getTempDir(`test${count++}`);
  const srcfile = path.join(dir, 'index.ts');
  const outfile = path.join(dir, 'index.js');
  await fs.promises.writeFile(
    srcfile,
    `
    const a = \` \n\n\n   <a>b   </a>   \n\n  \`;
    console.log(a);`,
    'utf8',
  );
  await esbuild.build({
    entryPoints: [srcfile],
    outfile,
    bundle: true,
    platform: 'node',
    minifyWhitespace: true,
    write: false,
    plugins: [minifyTemplates(), writeFiles()],
  });
  const result = await fs.promises.readFile(outfile, 'utf8');
  assert.fixture(result, 'var a=`<a>b </a>`;console.log(a);\n');
});

test('does not minify when build write is true', async () => {
  const dir = getTempDir(`test${count++}`);
  const srcfile = path.join(dir, 'index.ts');
  const outfile = path.join(dir, 'index.js');
  const source = `
    const a = \` \n\n\n   <a>b   </a>   \n\n  \`;
    console.log(a);
  `;
  await fs.promises.writeFile(srcfile, source, 'utf8');
  await esbuild.build({
    entryPoints: [srcfile],
    outfile,
    bundle: true,
    platform: 'node',
    minifyWhitespace: true,
    write: true,
    plugins: [minifyTemplates(), writeFiles()],
  });
  const result = await fs.promises.readFile(outfile, 'utf8');
  assert.fixture(
    result,
    'var a=` \n\n\n   <a>b   </a>   \n\n  `;console.log(a);\n',
  );
});
test('does not minify when build write is the default (undefined)', async () => {
  const dir = getTempDir(`test${count++}`);
  const srcfile = path.join(dir, 'index.ts');
  const outfile = path.join(dir, 'index.js');
  const source = `
    const a = \` \n\n\n   <a>b   </a>   \n\n  \`;
    console.log(a);
  `;
  await fs.promises.writeFile(srcfile, source, 'utf8');
  await esbuild.build({
    entryPoints: [srcfile],
    outfile,
    bundle: true,
    platform: 'node',
    minifyWhitespace: true,
    plugins: [minifyTemplates(), writeFiles()],
  });
  const result = await fs.promises.readFile(outfile, 'utf8');
  assert.fixture(
    result,
    'var a=` \n\n\n   <a>b   </a>   \n\n  `;console.log(a);\n',
  );
});

test.run();
