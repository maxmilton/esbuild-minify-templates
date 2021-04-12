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
