/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { test } from 'uvu';
import * as assert from 'uvu/assert';
import * as allExports from '../src/index';

const publicExports = [
  ['minify', 'function'],
  ['minifyTemplates', 'function'],
  ['writeFiles', 'function'],
  ['encodeUTF8', 'function'],
  ['decodeUTF8', 'function'],
] as const;

for (const [name, type] of publicExports) {
  test(`exports a "${name}" ${type}`, () => {
    assert.ok(name in allExports, 'is exported');
    assert.type(allExports[name], type);
  });
}

test('has no unexpected exports', () => {
  const exportNames = new Set(Object.keys(allExports));
  publicExports.forEach((publicExport) => {
    exportNames.delete(publicExport[0]);
  });
  // Synthetic default created by esbuild at test runtime -- follows ESM spec
  // where default is an object containing references to all the named exports
  exportNames.delete('default');
  assert.equal([...exportNames], []);
});

test('does not have a default export', () => {
  // @ts-expect-error - Synthetic default created by esbuild at test runtime
  assert.type(allExports.default, 'object');
  // @ts-expect-error - Synthetic default created by esbuild at test runtime
  assert.is(allExports.default.default, undefined);
  const bundle = require('../dist/index.js'); // eslint-disable-line
  assert.type(bundle, 'object');
  assert.is(bundle.default, undefined);
});

test.run();
