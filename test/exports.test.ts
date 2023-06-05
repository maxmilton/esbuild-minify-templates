import { expect, test } from 'bun:test';
import * as allExports from '../src/index';

const publicExports = [
  ['stripWhitespace', 'function'],
  ['minify', 'function'],
  ['minifyTemplates', 'function'],
  ['writeFiles', 'function'],
  ['encodeUTF8', 'function'],
  ['decodeUTF8', 'function'],
] as const;

for (const [name, type] of publicExports) {
  test(`exports a "${name}" ${type}`, () => {
    expect(allExports).toHaveProperty(name);
    expect(typeof allExports[name]).toBe(type);
  });
}

test('has no unexpected exports', () => {
  const exportNames = new Set(Object.keys(allExports));
  for (const publicExport of publicExports) {
    exportNames.delete(publicExport[0]);
  }
  // Synthetic default created by esbuild at test runtime -- follows ESM spec
  // where default is an object containing references to all the named exports
  exportNames.delete('default');
  expect([...exportNames]).toEqual([]);
});

test('default export is undefined', () => {
  // Runtime build (when tests run with bun)
  expect(allExports).toBeInstanceOf(Object);
  // @ts-expect-error - default doesn't exist
  expect(allExports.default).toBeUndefined();

  // Pre-built
  const bundle = import.meta.require('../dist/index.js') as { default?: unknown };
  expect(bundle).toBeInstanceOf(Object);
  expect(bundle.default).toBeUndefined();
});
