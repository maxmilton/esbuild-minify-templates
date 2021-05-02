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
  const directory = getTempDir(`test-${count++}`);
  const filename = 'mock.txt';
  const text = 'abc';
  const mockBuildResult = createMockBuildResult(text, directory, filename);
  await writeFiles(mockBuildResult);
  const result = await fs.promises.readFile(
    path.join(directory, filename),
    'utf-8',
  );
  assert.is(result, text);
});

test('writes multiple files to disk', async () => {
  const directory = getTempDir(`test-${count++}`);
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
      createMockBuildResult(text1, directory, filename1).outputFiles![0],
      createMockBuildResult(text2, directory, filename2).outputFiles![0],
      createMockBuildResult(text3, directory, filename3).outputFiles![0],
      createMockBuildResult(text4, directory, filename4).outputFiles![0],
      createMockBuildResult(text5, directory, filename5).outputFiles![0],
    ],
    errors: [],
    warnings: [],
  };
  await writeFiles(mockBuildResult);
  const result = await Promise.all([
    fs.promises.readFile(path.join(directory, filename1), 'utf-8'),
    fs.promises.readFile(path.join(directory, filename2), 'utf-8'),
    fs.promises.readFile(path.join(directory, filename3), 'utf-8'),
    fs.promises.readFile(path.join(directory, filename4), 'utf-8'),
    fs.promises.readFile(path.join(directory, filename5), 'utf-8'),
  ]);
  assert.equal(result, [text1, text2, text3, text4, text5]);
});

test.run();
