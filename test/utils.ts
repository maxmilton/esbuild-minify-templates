import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type esbuild from 'esbuild';
import { decodeUTF8, encodeUTF8 } from '../src/index';

type OnEndCallback = Parameters<esbuild.PluginBuild['onEnd']>[0];

export function esbuildTestHarness(
  { setup }: esbuild.Plugin,
  buildResult: esbuild.BuildResult,
  buildOptions?: esbuild.BuildOptions,
): ReturnType<OnEndCallback> | undefined {
  let cb: OnEndCallback | undefined;
  void setup({
    initialOptions: {
      write: false,
      ...buildOptions,
    },
    onEnd(callback) {
      cb = callback;
    },
  } as esbuild.PluginBuild);
  return cb?.(buildResult);
}

export function createMockBuildResult(
  content: string,
  dirPath = '.',
  fileName = 'mock.js',
): esbuild.BuildResult {
  return {
    outputFiles: [
      {
        path: path.join(dirPath, fileName),
        contents: encodeUTF8(content),
        hash: 'xxxx',
        get text() {
          return decodeUTF8(this.contents);
        },
      },
    ],
    errors: [],
    warnings: [],
    metafile: { inputs: {}, outputs: {} },
    mangleCache: {},
  };
}

interface Context {
  tmpDir?: string | undefined;
}

export async function createTempDir(context: Context): Promise<void> {
  if (context.tmpDir) {
    throw new Error('Temp directory exists, did you forget to call deleteTempDir()');
  }

  context.tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'git-ref-test-'));
}

export async function deleteTempDir(context: Context): Promise<void> {
  if (!context.tmpDir) {
    throw new Error('No temp directory exists, you need to call createTempDir() first');
  }

  await fs.promises.rm(context.tmpDir, {
    force: true,
    recursive: true,
  });

  context.tmpDir = undefined;
}

export function getTempDir(context: Context, subDir?: string): string {
  if (!context.tmpDir) {
    throw new Error('No temp directory exists, you need to call createTempDir() first');
  }

  if (subDir) {
    const newDir = path.join(context.tmpDir, subDir);
    fs.mkdirSync(newDir);
    return newDir;
  }

  return context.tmpDir;
}
