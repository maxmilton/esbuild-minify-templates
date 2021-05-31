[![Build status](https://img.shields.io/github/workflow/status/maxmilton/esbuild-minify-templates/ci)](https://github.com/maxmilton/esbuild-minify-templates/actions)
[![Coverage status](https://img.shields.io/codeclimate/coverage/MaxMilton/esbuild-minify-templates)](https://codeclimate.com/github/MaxMilton/esbuild-minify-templates)
[![NPM version](https://img.shields.io/npm/v/esbuild-minify-templates.svg)](https://www.npmjs.com/package/esbuild-minify-templates)
[![NPM bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/esbuild-minify-templates.svg)](https://bundlephobia.com/result?p=esbuild-minify-templates)
[![Licence](https://img.shields.io/github/license/maxmilton/esbuild-minify-templates.svg)](https://github.com/maxmilton/esbuild-minify-templates/blob/master/LICENSE)

# esbuild-minify-templates

Tool to minify [template literal strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) as part of an [esbuild](https://esbuild.github.io/) powered build process.

**Features:**

- Collapses whitespace in template literal strings
- Removes whitespace in template literal strings around HTML tags
- Source map support
- Ability to ignore specific template literals

## Installation

```sh
npm install --save-dev esbuild-minify-templates
```

or

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
  .catch((e) => {
    throw e;
  });
```

## Options

#### Tagged template literals only

Only minify tagged template literals (instead of all template literals) by setting the `MINIFY_TAGGED_TEMPLATES_ONLY` environment variable to a non-empty string.

`build.mjs`:

```js
process.env.MINIFY_TAGGED_TEMPLATES_ONLY = 'true';
```

## Ignoring specific template literals

If you run into a situation where you don't want a certain template literal string to be minified, you can add a `/* minify-templates-ignore */` block comment on the line directly before it. This is especially useful for using template literals with the `RegExp` constructor or otherwise in situations where whitespace is meaningful.

> Note: This will only work with the esbuild `minify` option set to `false` because esbuild automatically removes the comments before we can read them. It's a known issue and we're exploring options for making this work with minify.

`ignore-examples.js`:

```js
// Dynamically constructed regular expression

/* minify-templates-ignore */
const re = new RegExp(`   <-- ${commentMsg}`, 'g');

// String where whitespace is meaningful

/* minify-templates-ignore */
codeEditor.setContent(`
  body {
    font-size: 20px;
    color: coral;
  }
`);
```

## Changelog

See [releases on GitHub](https://github.com/maxmilton/esbuild-minify-templates/releases).

## Licence

`esbuild-minify-templates` is an MIT licensed open source project. See [LICENCE](https://github.com/maxmilton/esbuild-minify-templates/blob/master/LICENCE).

---

© 2021 [Max Milton](https://maxmilton.com)
