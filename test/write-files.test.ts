/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/restrict-template-expressions, no-plusplus */

import { afterAll, beforeAll, expect, test } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { writeFiles } from '../src/index.ts';
import {
  createMockBuildResult,
  createTempDir,
  deleteTempDir,
  esbuildTestHarness,
  getTempDir,
} from './utils.ts';

const context = {};
beforeAll(() => createTempDir(context));
afterAll(() => deleteTempDir(context));

let count = 0;

test('is a function', () => {
  expect.assertions(2);
  expect(writeFiles).toBeFunction();
  expect(writeFiles).not.toBeClass();
});

test('expects 0 parameters', () => {
  expect.assertions(1);
  expect(writeFiles).toHaveParameters(0, 0);
});

test('writes single file to disk', async () => {
  const dir = getTempDir(context, `test${count++}`);
  const filename = 'mock.txt';
  const text = 'abc';
  const mockBuildResult = createMockBuildResult(text, dir, filename);
  await esbuildTestHarness(writeFiles(), mockBuildResult);
  const result = await Bun.file(path.join(dir, filename)).text();
  expect(result).toBe(text);
});

test('writes multiple files to disk', async () => {
  const dir = getTempDir(context, `test${count++}`);
  const filename1 = 'mock.js';
  const filename2 = 'mock.js.map';
  const filename3 = 'mock.css';
  const filename4 = 'mock.css.map';
  const filename5 = 'mock.html';
  const text1 = 'file1';
  const text2 = 'file2';
  const text3 = 'file3';
  const text4 = 'file4';
  const text5 = 'file5';
  const mockBuildResult = {
    outputFiles: [
      createMockBuildResult(text1, dir, filename1).outputFiles![0],
      createMockBuildResult(text2, dir, filename2).outputFiles![0],
      createMockBuildResult(text3, dir, filename3).outputFiles![0],
      createMockBuildResult(text4, dir, filename4).outputFiles![0],
      createMockBuildResult(text5, dir, filename5).outputFiles![0],
    ],
    errors: [],
    warnings: [],
    metafile: { inputs: {}, outputs: {} },
    mangleCache: {},
  };
  await esbuildTestHarness(writeFiles(), mockBuildResult);
  const result = await Promise.all([
    Bun.file(path.join(dir, filename1)).text(),
    Bun.file(path.join(dir, filename2)).text(),
    Bun.file(path.join(dir, filename3)).text(),
    Bun.file(path.join(dir, filename4)).text(),
    Bun.file(path.join(dir, filename5)).text(),
  ]);
  expect(result).toEqual([text1, text2, text3, text4, text5]);
});

test('correctly writes UTF-8 encoded text', async () => {
  const dir = getTempDir(context, `test${count++}`);
  const filename = 'mock.txt';
  const text = 'a\u00A0b\u2003c\u3000d 🤔👾💣';
  const mockBuildResult = createMockBuildResult(text, dir, filename);
  await esbuildTestHarness(writeFiles(), mockBuildResult);
  const result = await Bun.file(path.join(dir, filename)).text();
  expect(result).toBe(text);
});

test('creates directories before writing files', async () => {
  const dir = getTempDir(context, `test${count++}`);
  const filename1 = 'dir1/file1.txt';
  const filename2 = 'dir1/dir2/file2.txt';
  const filename3 = 'dir3/dir4/dir5/file3.txt';
  const mockBuildResult = {
    outputFiles: [
      createMockBuildResult('', dir, filename1).outputFiles![0],
      createMockBuildResult('', dir, filename2).outputFiles![0],
      createMockBuildResult('', dir, filename3).outputFiles![0],
    ],
    errors: [],
    warnings: [],
    metafile: { inputs: {}, outputs: {} },
    mangleCache: {},
  };
  await esbuildTestHarness(writeFiles(), mockBuildResult);
  const result = await Promise.all([
    fs.stat(path.join(dir, 'dir1')),
    fs.stat(path.join(dir, 'dir1/dir2')),
    fs.stat(path.join(dir, 'dir3/dir4/dir5')),
    fs.stat(path.join(dir, filename1)),
    fs.stat(path.join(dir, filename2)),
    fs.stat(path.join(dir, filename3)),
  ]);
  expect(result[0].isDirectory()).toBe(true);
  expect(result[1].isDirectory()).toBe(true);
  expect(result[2].isDirectory()).toBe(true);
  expect(result[3].isFile()).toBe(true);
  expect(result[4].isFile()).toBe(true);
  expect(result[5].isFile()).toBe(true);
  expect(result[0].isSymbolicLink()).toBe(false);
  expect(result[1].isSymbolicLink()).toBe(false);
  expect(result[2].isSymbolicLink()).toBe(false);
  expect(result[3].isSymbolicLink()).toBe(false);
  expect(result[4].isSymbolicLink()).toBe(false);
  expect(result[5].isSymbolicLink()).toBe(false);
});

test('does not write files when build write is true', async () => {
  const dir = getTempDir(context, `test${count++}`);
  const filename = 'mock.txt';
  const mockBuildResult = createMockBuildResult('', dir, filename);
  await esbuildTestHarness(writeFiles(), mockBuildResult, { write: true });
  const files = await fs.readdir(dir);
  expect(files).toHaveLength(0);
});

test('does not write files when build write is undefined', async () => {
  const dir = getTempDir(context, `test${count++}`);
  const filename = 'mock.txt';
  const mockBuildResult = createMockBuildResult('', dir, filename);
  // @ts-expect-error - undefined is the default value
  await esbuildTestHarness(writeFiles(), mockBuildResult, { write: undefined });
  const files = await fs.readdir(dir);
  expect(files).toHaveLength(0);
});
