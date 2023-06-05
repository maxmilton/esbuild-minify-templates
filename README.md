[![Build status](https://img.shields.io/github/actions/workflow/status/maxmilton/esbuild-minify-templates/ci.yml?branch=master)](https://github.com/maxmilton/esbuild-minify-templates/actions)
[![Coverage status](https://img.shields.io/codeclimate/coverage/maxmilton/esbuild-minify-templates)](https://codeclimate.com/github/maxmilton/esbuild-minify-templates)
[![NPM version](https://img.shields.io/npm/v/esbuild-minify-templates.svg)](https://www.npmjs.com/package/esbuild-minify-templates)
[![NPM bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/esbuild-minify-templates.svg)](https://bundlephobia.com/result?p=esbuild-minify-templates)
[![Licence](https://img.shields.io/github/license/maxmilton/esbuild-minify-templates.svg)](https://github.com/maxmilton/esbuild-minify-templates/blob/master/LICENSE)

# esbuild-minify-templates

Tools to minify [template literal strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) as part of an [esbuild](https://esbuild.github.io/) powered build process.

**Features:**

- Collapses whitespace in template literal strings
- Removes whitespace in template literal strings around HTML tags
- Source map support
- Ignore specific template literals

## Installation

```sh
npm install --save-dev esbuild-minify-templates
```

## Usage

Add the two esbuild plugins to your build options and set the [write option](https://esbuild.github.io/api/#write) to false.

`build.mjs`:

```js
import esbuild from 'esbuild';
import { minifyTemplates, writeFiles } from 'esbuild-minify-templates';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  plugins: [minifyTemplates(), writeFiles()], // <--
  bundle: true,
  sourcemap: true,
  write: false, // <-- important!
});
```

### Production only

If you only want to minify templates in certain builds, set the [esbuild `write` option](https://esbuild.github.io/api/#write) to `true` when you want to skip minification. The `minifyTemplates` and `writeFiles` plugins will do nothing in this case. For example:

```js
esbuild.build({
  ...
  write: process.env.NODE_ENV !== 'production',
})
```

## Options

### `minifyTemplates(opts?)`

#### `keepComments`

Type: `boolean`  
Default: `false`

By default HTML comments are removed within your template literals. By setting `keepComments` to true, comments will be left in place (but whitespace etc. will still be minified within them).

#### `taggedOnly`

Type: `boolean`  
Default: `false`

Only minify [tagged template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) (instead of all template literals).

### `writeFiles()`

The plugin has no options but is required to write out in-memory sources to disk. This must be performed separately because esbuild currently has no way to access or modify build output without setting the `write` build option to false.

Place this plugin after plugins which modify build output.

## Ignoring specific template literals

> Tip: An alternative workaround is to use regular non-template strings for the strings you want to keep untouched.

If you run into a situation where you don't want a certain template literal string to be minified, you can add a `/*! minify-templates-ignore */` block comment on the line directly before it. This is especially useful for using template literals with the `RegExp` constructor or otherwise in situations where whitespace is meaningful.

> Note: This will only work with the [esbuild `minify` option](https://esbuild.github.io/api/#minify) set to `false` and [esbuild `legalComments` option](https://esbuild.github.io/api/#legal-comments) set to `'inline'` because, other than legal comments and pure annotations, esbuild strips out all comments before we can read them. See <https://github.com/evanw/esbuild/issues/221>. Minify false is required because currently this plugin's logic is overly simple and works with line offsets.
>
> This feature should be used as a last resort and so is currently not ergonomic to use.
>
> A solution for minification is to pass the output back into a second `esbuild.build()` for minify only. Or use another minification tool like [terser](https://github.com/terser/terser) which has the added benfit of generating a [1–2% smaller output](https://github.com/privatenumber/minification-benchmarks#-results) than esbuild's minification (but is much slower).

`ignore-examples.js`:

```js
// Dynamically constructed regular expression

/*! minify-templates-ignore */
const re = new RegExp(`    <-- ${commentMsg}`, 'g');

// String where whitespace is meaningful

/*! minify-templates-ignore */
codeEditor.setContent(`
  body {
    font-size: 20px;
    color: coral;
  }
`);
```

## Standalone minification

### Template literals

You can also do template literal minification separately. The `minify` function takes JavaScript source code as input and will minify template literals within it. It also takes the same options as `minifyTemplates` as a second argument.

Also note that this exports a `MagicString` instance, so you need to call [magicstring's `.toString()`](https://github.com/Rich-Harris/magic-string#stostring) on it.

```js
import { minify } from 'esbuild-minify-templates';

const result = minify('let a = `x     y`;');

console.log(result.toString()); // 'let a = `x y`;'
```

### HTML code strings

In situations where you have HTML code as a plain string, this package also exports a `stripWhitespace` function for standalone use.

```js
import { stripWhitespace } from 'esbuild-minify-templates';

const result = stripWhitespace('x     y');

console.log(result); // 'x y'
```

## Changelog

See [releases on GitHub](https://github.com/maxmilton/esbuild-minify-templates/releases).

## Licence

MIT license. See [LICENSE](https://github.com/maxmilton/esbuild-minify-templates/blob/master/LICENSE).

---

© 2023 [Max Milton](https://maxmilton.com)
