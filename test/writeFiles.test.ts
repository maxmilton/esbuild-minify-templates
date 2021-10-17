/* eslint-disable @typescript-eslint/no-non-null-assertion, no-plusplus */

import fs from 'fs';
import path from 'path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { writeFiles } from '../src/index';
import {
  createMockBuildResult,
  createTempDir,
  deleteTempDir,
  getTempDir,
} from './utils';

let count = 0;

test.before(createTempDir);
test.after(deleteTempDir);

test('writes single file to disk', async () => {
  const dir = getTempDir(`test${count++}`);
  const filename = 'mock.txt';
  const text = 'abc';
  const mockBuildResult = createMockBuildResult(text, dir, filename);
  await writeFiles(mockBuildResult);
  const result = await fs.promises.readFile(path.join(dir, filename), 'utf-8');
  assert.is(result, text);
});

test('writes multiple files to disk', async () => {
  const dir = getTempDir(`test${count++}`);
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
  };
  await writeFiles(mockBuildResult);
  const result = await Promise.all([
    fs.promises.readFile(path.join(dir, filename1), 'utf-8'),
    fs.promises.readFile(path.join(dir, filename2), 'utf-8'),
    fs.promises.readFile(path.join(dir, filename3), 'utf-8'),
    fs.promises.readFile(path.join(dir, filename4), 'utf-8'),
    fs.promises.readFile(path.join(dir, filename5), 'utf-8'),
  ]);
  assert.equal(result, [text1, text2, text3, text4, text5]);
});

test('correctly writes UTF-8 encoded text', async () => {
  const dir = getTempDir(`test${count++}`);
  const filename = 'mock.txt';
  const text = 'a\u00a0b\u2003c\u3000d 🤔👾💣';
  const mockBuildResult = createMockBuildResult(text, dir, filename);
  await writeFiles(mockBuildResult);
  const result = await fs.promises.readFile(path.join(dir, filename), 'utf-8');
  assert.is(result, text);
});

test('creates directories before writing files', async () => {
  const dir = getTempDir(`test${count++}`);
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
  };
  await writeFiles(mockBuildResult);
  const result = await Promise.all([
    fs.promises.stat(path.join(dir, 'dir1')),
    fs.promises.stat(path.join(dir, 'dir1/dir2')),
    fs.promises.stat(path.join(dir, 'dir3/dir4/dir5')),
    fs.promises.stat(path.join(dir, filename1)),
    fs.promises.stat(path.join(dir, filename2)),
    fs.promises.stat(path.join(dir, filename3)),
  ]);
  assert.ok(result[0].isDirectory());
  assert.ok(result[1].isDirectory());
  assert.ok(result[2].isDirectory());
  assert.ok(result[3].isFile());
  assert.ok(result[4].isFile());
  assert.ok(result[5].isFile());
  assert.not(result[0].isSymbolicLink());
  assert.not(result[1].isSymbolicLink());
  assert.not(result[2].isSymbolicLink());
  assert.not(result[3].isSymbolicLink());
  assert.not(result[4].isSymbolicLink());
  assert.not(result[5].isSymbolicLink());
});

test.run();
