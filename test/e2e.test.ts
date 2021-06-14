/* eslint-disable no-plusplus */

import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { minifyTemplates, writeFiles } from '../dist';
import { createTempDir, deleteTempDir, getTempDir } from './utils';

let count = 0;

test.before(createTempDir);
test.after(deleteTempDir);

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
  const built = await esbuild.build({
    entryPoints: [srcfile],
    outfile,
    bundle: true,
    platform: 'node',
    minifyWhitespace: true,
    write: false,
  });
  const minified = minifyTemplates(built);
  await writeFiles(minified);
  const result = await fs.promises.readFile(outfile, 'utf8');
  assert.fixture(result, 'var a=`<a>b </a>`;console.log(a);\n');
});

test.run();
