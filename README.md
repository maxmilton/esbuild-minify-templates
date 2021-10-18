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
- Ignore specific template literals

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

### Production only

If you only want to minify templates in certain builds, set the [esbuild `write` option](https://esbuild.github.io/api/#write) to `true` when you want to skip minification. The `minifyTemplates` and `writeFiles` functions will do nothing in this case. For example:

```js
esbuild.build({
  ...
  write: process.env.NODE_ENV !== 'production',
})
```

### Standalone minification

Minification can also be used separately. The `minify` function takes JavaScript source code as input and will minify template literals within it.

```js
import { minify } from 'esbuild-minify-templates';

const result = minify('let a = `x     y`;');

console.log(result.toString()); // 'let a = `x y`;'
```

## Options

### Remove HTML comments

By default HTML comments are left in place (but whitespace etc. will still be minified within them). If you wish to remove HTML comments set the `MINIFY_HTML_COMMENTS` environment variable to a non-empty string.

`build.mjs`:

```js
process.env.MINIFY_HTML_COMMENTS = 'true';
```

### Tagged template literals only

Only minify tagged template literals (instead of all template literals) by setting the `MINIFY_TAGGED_TEMPLATES_ONLY` environment variable to a non-empty string.

`build.mjs`:

```js
process.env.MINIFY_TAGGED_TEMPLATES_ONLY = 'true';
```

## Ignoring specific template literals

If you run into a situation where you don't want a certain template literal string to be minified, you can add a `/* minify-templates-ignore */` block comment on the line directly before it. This is especially useful for using template literals with the `RegExp` constructor or otherwise in situations where whitespace is meaningful.

> Note: This will only work with the [esbuild `minify` option](https://esbuild.github.io/api/#minify) set to `false` because otherwise esbuild removes the comments before we can read them. The recommended solution is to pass the output into another minification tool like [terser](https://github.com/terser/terser) which has the added benfit of generating a [1–2% smaller output](https://github.com/privatenumber/minification-benchmarks#-results) than esbuild's minification (but is much slower).

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

MIT license. See [LICENSE](https://github.com/maxmilton/esbuild-minify-templates/blob/master/LICENSE).

---

© 2021 [Max Milton](https://maxmilton.com)
