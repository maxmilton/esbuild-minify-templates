/* eslint-disable no-console */

import esbuild from "esbuild";
import ts from "typescript";
import pkg from "./package.json" with { type: "json" };

const external = Object.keys(pkg.dependencies);

console.time("prebuild");
await Bun.$`rm -rf dist`;
console.timeEnd("prebuild");

// Node CJS bundle
console.time("build:1");
const out1 = await esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  platform: "node",
  target: ["node12"],
  external,
  bundle: true,
  sourcemap: true,
  minify: true,
  metafile: process.stdout.isTTY,
  logLevel: "debug",
});
console.timeEnd("build:1");
if (out1.metafile) console.log(await esbuild.analyzeMetafile(out1.metafile));

// Node ESM bundle
console.time("build:2");
const out2 = await esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.mjs",
  platform: "node",
  format: "esm",
  target: ["node16"],
  external,
  bundle: true,
  sourcemap: true,
  minify: true,
  metafile: process.stdout.isTTY,
  logLevel: "debug",
});
console.timeEnd("build:2");
if (out2.metafile) console.log(await esbuild.analyzeMetafile(out2.metafile));

console.time("dts");
const config: ts.CompilerOptions = {
  emitDeclarationOnly: true,
  declaration: true,
  declarationMap: true,
  declarationDir: "dist",
  skipLibCheck: true,
};
const result = ts
  .createProgram(["src/index.ts"], config)
  .emit(undefined, undefined, undefined, true);
if (result.emitSkipped) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(result.diagnostics, ts.createCompilerHost(config)),
  );
  process.exitCode = 1;
}
console.timeEnd("dts");
