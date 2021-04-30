[![Build status](https://img.shields.io/github/workflow/status/MaxMilton/esbuild-minify-templates/ci)](https://github.com/MaxMilton/esbuild-minify-templates/actions)
[![Coverage status](https://img.shields.io/codeclimate/coverage/MaxMilton/esbuild-minify-templates)](https://codeclimate.com/github/MaxMilton/esbuild-minify-templates)
[![NPM version](https://img.shields.io/npm/v/esbuild-minify-templates.svg)](https://www.npmjs.com/package/esbuild-minify-templates)
[![NPM bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/esbuild-minify-templates.svg)](https://bundlephobia.com/result?p=esbuild-minify-templates)
[![Licence](https://img.shields.io/github/license/MaxMilton/esbuild-minify-templates.svg)](https://github.com/MaxMilton/esbuild-minify-templates/blob/master/LICENSE)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

# esbuild-minify-templates

Tool to minify [template literal strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) as part of an [esbuild](https://esbuild.github.io/) powered build process.

**Features:**

- Collapses whitespace in template literal strings
- Removes whitespace in template literal strings around HTML tags
- Source map support

## Installation

```sh
yarn add -D esbuild-minify-templates
```

## Usage

`build.mjs`:

```js
import esbuild from 'esbuild';
import { minifyTemplates, writeFiles } from 'esbuild-minify-templates';

esbuild
  .build({
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    sourcemap: true,
    write: false, // <-- this is important!
  })
  .then(minifyTemplates)
  .then(writeFiles)
  .catch(() => process.exit(1));
```

## Licence

`esbuild-minify-templates` is an MIT licensed open source project. See [LICENCE](https://github.com/MaxMilton/esbuild-minify-templates/blob/master/LICENCE).

---

© 2021 [Max Milton](https://maxmilton.com)
