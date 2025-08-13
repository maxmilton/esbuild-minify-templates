/* eslint-disable @typescript-eslint/restrict-template-expressions, no-plusplus */

import { afterAll, beforeAll, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";
import { minifyTemplates, writeFiles } from "../dist/index.js";
import { createTempDir, deleteTempDir, getTempDir } from "./utils.ts";

const context = {};
beforeAll(() => createTempDir(context));
afterAll(() => deleteTempDir(context));

let count = 0;

// TODO: Test incremental builds and watch mode

test("build runs without error", async () => {
  const dir = getTempDir(context, `test${count++}`);
  const srcfile = path.join(dir, "index.ts");
  const outfile = path.join(dir, "index.js");
  await fs.promises.writeFile(
    srcfile,
    `
    const a = \` \n\n\n   <a>b   </a>   \n\n  \`;
    console.log(a);`,
    "utf8",
  );
  await esbuild.build({
    entryPoints: [srcfile],
    outfile,
    bundle: true,
    platform: "node",
    minifyWhitespace: true,
    write: false,
    plugins: [minifyTemplates(), writeFiles()],
  });
  const result = await fs.promises.readFile(outfile, "utf8");
  // TODO: Use toMatchInlineSnapshot once bun test supports it
  expect(result).toBe("var a=`<a>b </a>`;console.log(a);\n");
});

test("does not minify when build write is true", async () => {
  const dir = getTempDir(context, `test${count++}`);
  const srcfile = path.join(dir, "index.ts");
  const outfile = path.join(dir, "index.js");
  const source = `
    const a = \` \n\n\n   <a>b   </a>   \n\n  \`;
    console.log(a);
  `;
  await fs.promises.writeFile(srcfile, source, "utf8");
  await esbuild.build({
    entryPoints: [srcfile],
    outfile,
    bundle: true,
    platform: "node",
    minifyWhitespace: true,
    write: true,
    plugins: [minifyTemplates(), writeFiles()],
  });
  const result = await fs.promises.readFile(outfile, "utf8");
  // TODO: Use toMatchInlineSnapshot once bun test supports it
  expect(result).toBe("var a=` \n\n\n   <a>b   </a>   \n\n  `;console.log(a);\n");
});
test("does not minify when build write is the default (undefined)", async () => {
  const dir = getTempDir(context, `test${count++}`);
  const srcfile = path.join(dir, "index.ts");
  const outfile = path.join(dir, "index.js");
  const source = `
    const a = \` \n\n\n   <a>b   </a>   \n\n  \`;
    console.log(a);
  `;
  await fs.promises.writeFile(srcfile, source, "utf8");
  await esbuild.build({
    entryPoints: [srcfile],
    outfile,
    bundle: true,
    platform: "node",
    minifyWhitespace: true,
    plugins: [minifyTemplates(), writeFiles()],
  });
  const result = await fs.promises.readFile(outfile, "utf8");
  // TODO: Use toMatchInlineSnapshot once bun test supports it
  expect(result).toBe("var a=` \n\n\n   <a>b   </a>   \n\n  `;console.log(a);\n");
});
