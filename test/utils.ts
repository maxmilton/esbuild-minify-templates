import type { BuildResult } from 'esbuild';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { decodeUTF8, encodeUTF8 } from '../src/index';

export function createMockBuildResult(
  content: string,
  dirPath = '.',
  fileName = 'mock.js',
): BuildResult {
  return {
    outputFiles: [
      {
        path: path.join(dirPath, fileName),
        contents: encodeUTF8(content),
        get text() {
          return decodeUTF8(this.contents);
        },
      },
    ],
    errors: [],
    warnings: [],
  };
}

let tmpDir: string | undefined;

export async function createTempDir(): Promise<void> {
  tmpDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'esbuild-minify-templates-test-'),
  );
}

export async function deleteTempDir(): Promise<void> {
  if (tmpDir) {
    await fs.promises.rm(tmpDir, {
      force: true,
      recursive: true,
    });

    tmpDir = undefined;
  }
}

export function getTempDir(subDir?: string): string {
  if (!tmpDir) {
    throw new Error(
      'No temp directory exists, you need to call createTempDir() first',
    );
  }

  if (subDir) {
    const newDir = path.join(tmpDir, subDir);
    fs.mkdirSync(newDir);
    return newDir;
  }

  return tmpDir;
}
