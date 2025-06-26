/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { expect, test } from 'bun:test';
import type { BuildResult } from 'esbuild';
import MagicString, { type SourceMap } from 'magic-string';
import { decodeUTF8, minify, minifyTemplates } from '../src/index.ts';
import { createMockBuildResult, esbuildTestHarness } from './utils.ts';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes
// https://en.wikipedia.org/wiki/ASCII#Control_code_chart
// https://qwerty.dev/whitespace/
const whitespaces = [
  [' ', 'space'],
  ['\f', 'form feed'], // "new page"
  ['\n', 'line feed'], // "new line"
  ['\r', 'carriage return'],
  ['\t', 'horizontal tab'],
  ['\v', 'vertical tab'],
  ['\u00A0', 'no-break space'], // &nbsp;
  ['\u1680', 'ogham space mark'],
  ['\u2000', 'en quad'],
  ['\u2001', 'em quad'],
  ['\u2002', 'en space'], // &ensp;
  ['\u2003', 'em space'], // &emsp;
  ['\u2004', 'three-per-em space'], // &emsp13;
  ['\u2005', 'four-per-em space'], // &emsp14;
  ['\u2006', 'six-per-em space'],
  ['\u2007', 'figure space'], // &numsp;
  ['\u2008', 'punctuation space'], // &puncsp;
  ['\u2009', 'thin space'], // &thinsp;
  ['\u200A', 'hair space'],
  ['\u2028', 'line separator'],
  ['\u2029', 'paragraph separator'],
  ['\u202F', 'narrow no-break space'],
  ['\u205F', 'medium mathematical space'],
  ['\u3000', 'ideographic space'],
  ['\uFEFF', 'zero width no-break space'],

  // XXX: Not whitespace but worth pointing out there is also:
  // ['\u200b', 'zero-width space'],
];
const allWhitespace = whitespaces.map(([val]) => val).join('');

function getOutput(buildResult: BuildResult, index = 0) {
  return decodeUTF8(buildResult.outputFiles![index].contents);
}

test('is a function', () => {
  expect.assertions(2);
  expect(minifyTemplates).toBeFunction();
  expect(minifyTemplates).not.toBeClass();
});

test('expects 1 parameter', () => {
  expect.assertions(1);
  expect(minifyTemplates).toHaveParameters(0, 1);
});

// Minification

for (const [value, name] of whitespaces) {
  test(`reduces single ${name || JSON.stringify(value)} to a single space`, () => {
    const mockBuildResult = createMockBuildResult(`let a = \`${value}\`;`);
    void esbuildTestHarness(minifyTemplates(), mockBuildResult);
    expect(getOutput(mockBuildResult)).toBe('let a = ` `;');
  });
  test(`reduces multiple ${name || JSON.stringify(value)}s to a single space`, () => {
    const mockBuildResult = createMockBuildResult(`let a = \`${value}${value}${value}\`;`);
    void esbuildTestHarness(minifyTemplates(), mockBuildResult);
    expect(getOutput(mockBuildResult)).toBe('let a = ` `;');
  });
}

test('reduces all whitespaces to a single space', () => {
  const mockBuildResult = createMockBuildResult(`let a = \`${allWhitespace}\`;`);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = ` `;');
});
test('does not reduce all whitespaces when escaped', () => {
  const escapedWhitespaces =
    // eslint-disable-next-line unicorn/prefer-string-raw
    "' '' '' '\\f\\n\\r\\t\\v\\u00a0\\u1680\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff";
  const source = `let a = \`${escapedWhitespaces}\`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(source);
});

test('removes single space between tags', () => {
  const mockBuildResult = createMockBuildResult('let a = `> <`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = `><`;');
});
test('removes multiple whitespace between tags', () => {
  const mockBuildResult = createMockBuildResult(`let a = \`>${allWhitespace}<\`;`);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = `><`;');
});
test('removes space between start and <', () => {
  const mockBuildResult = createMockBuildResult('let a = ` <`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = `<`;');
});
test('removes multiple whitespace between start and <', () => {
  const mockBuildResult = createMockBuildResult(`let a = \`${allWhitespace}<\`;`);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = `<`;');
});
test('removes space between > and end', () => {
  const mockBuildResult = createMockBuildResult('let a = `> `;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = `>`;');
});
test('removes multiple whitespace between > and end', () => {
  const mockBuildResult = createMockBuildResult(`let a = \`>${allWhitespace}\`;`);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = `>`;');
});

test('does not remove space between text and <', () => {
  const source = `
let a = \`text <\`;
let b = \`| <\`;
let c = \`© <\`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(source);
});
test('does not remove space between > and text', () => {
  const source = `
let a = \`> text\`;
let b = \`> |\`;
let b = \`> ©\`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(source);
});
test('does not remove space between > and >', () => {
  const source = 'let a = `> >`;';
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(source);
});
test('does not remove space between < and <', () => {
  const source = 'let a = `< <`;';
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(source);
});

// Raw template literals

test('correctly modifies template literal on only line', () => {
  const mockBuildResult = createMockBuildResult('let a = `x   y`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = `x y`;');
});
test('correctly modifies template literal on first line ', () => {
  const mockBuildResult = createMockBuildResult('let a = `x   y`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = `x y`;\n\n');
});
test('correctly modifies template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = `x   y`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('\nlet a = `x y`;\n\n');
});
test('correctly modifies template literal on tenth line', () => {
  const mockBuildResult = createMockBuildResult('\n\n\n\n\n\n\n\n\nlet a = `x   y`;\n\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('\n\n\n\n\n\n\n\n\nlet a = `x y`;\n\n\n');
});
test('correctly modifies multi-line template literal on first line', () => {
  const mockBuildResult = createMockBuildResult('let a = `x\n\n\ny`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = `x y`;');
});
test('correctly modifies multi-line template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = `x\n\n\ny`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('\nlet a = `x y`;\n\n');
});

// Tagged template literals
// Note there should be no difference between raw and tagged template literals

test('correctly modifies tagged template literal on only line', () => {
  const mockBuildResult = createMockBuildResult('let a = h`x   y`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = h`x y`;');
});
test('correctly modifies tagged template literal on first line ', () => {
  const mockBuildResult = createMockBuildResult('let a = h`x   y`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = h`x y`;\n\n');
});
test('correctly modifies tagged template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = h`x   y`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('\nlet a = h`x y`;\n\n');
});
test('correctly modifies tagged template literal on tenth line', () => {
  const mockBuildResult = createMockBuildResult('\n\n\n\n\n\n\n\n\nlet a = h`x   y`;\n\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('\n\n\n\n\n\n\n\n\nlet a = h`x y`;\n\n\n');
});
test('correctly modifies multi-line tagged template literal on first line', () => {
  const mockBuildResult = createMockBuildResult('let a = h`x\n\n\ny`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('let a = h`x y`;');
});
test('correctly modifies multi-line tagged template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = h`x\n\n\ny`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('\nlet a = h`x y`;\n\n');
});

// Nested template literals

test('correctly modify nested template literals', () => {
  const mockBuildResult = createMockBuildResult(`
let b = \`
\${\`x   \n\n\t\ty\`}
\${h\`x   y\`}
   \`;`);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  // eslint-disable-next-line no-template-curly-in-string
  expect(getOutput(mockBuildResult)).toBe('\nlet b = ` ${`x y`} ${h`x y`} `;');
});

// Plain strings

test('does not modify non-template string with single quotes', () => {
  const source = `
let a = 'x   y';
let b = 'x\\n\\n\\ny';
let c = 'x\t\t\ty';
let d = '   <br>   <br>   <br>   ';`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(source);
});
test('does not modify non-template string with double quotes', () => {
  const source = `
let a = "x   y";
let b = "x\\n\\n\\ny";
let c = "x\t\t\ty";
let d = "   <br>   <br>   <br>   ";`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(source);
});

// "Ignore comment" feature

// FIXME: These tests are not really doing anything. It's only when actually
// run with esbuild that any difference is apparent.

test('does not modify template literals with an ignore comment', () => {
  const mockBuildResult = createMockBuildResult(`
/*! minify-templates-ignore */
let re1 = new RegExp(\`   <-- \${commentMsg}\`, 'gm');
let re2 = new RegExp(\`   <-- \${commentMsg}\`, 'gm');

/*! minify-templates-ignore */
codeEditor.setContent(\`
  body {
    font-size: 20px;
    color: coral;
  }
\`);
codeEditor.setContent(\`
  body {
    font-size: 20px;
    color: coral;
  }
\`);`);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(`
/*! minify-templates-ignore */
let re1 = new RegExp(\`   <-- \${commentMsg}\`, 'gm');
let re2 = new RegExp(\`<-- \${commentMsg}\`, 'gm');

/*! minify-templates-ignore */
codeEditor.setContent(\`
  body {
    font-size: 20px;
    color: coral;
  }
\`);
codeEditor.setContent(\` body { font-size: 20px; color: coral; } \`);`);
});

test('does not modify nested template literals when parent has an ignore comment', () => {
  const mockBuildResult = createMockBuildResult(`
/*! minify-templates-ignore */
let a = \`
\${\`x   y\`}
\${h\`x   y\`}
   \`;
let b = \`
\${\`x   y\`}
\${h\`x   y\`}
   \`;`);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(
    `
/*! minify-templates-ignore */
let a = \`
\${\`x   y\`}
\${h\`x   y\`}
   \`;
let b = \` \${\`x y\`} \${h\`x y\`} \`;`,
  );
});

test('modifies tagged template literals when taggedOnly is true', () => {
  const mockBuildResult = createMockBuildResult(`
let a = h\`x   y\`;
let b = h\`x\n\n\ny\`;
let c = h\`x\t\t\ty\`;
let d = h\`   <br>   <br>   <br>   \`;`);
  void esbuildTestHarness(minifyTemplates({ taggedOnly: true }), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(`
let a = h\`x y\`;
let b = h\`x y\`;
let c = h\`x y\`;
let d = h\`<br><br><br>\`;`);
});

test('does not modify non-tagged template literals when taggedOnly is true', () => {
  const source = `
let a = \`x   y\`;
let b = \`x\n\n\ny\`;
let c = \`x\t\t\ty\`;
let d = \`   <br>   <br>   <br>   \`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates({ taggedOnly: true }), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(source);
});

// HTML comments

test('removes HTML comments when MINIFY_HTML_COMMENTS env var is set', () => {
  process.env.MINIFY_HTML_COMMENTS = 'true';
  const source = `
let a = \`<!--   -->\`;
let b = \`<!--\n\n\n-->\`;
let c = \`<!--\t\t\t-->\`;
let d = \`   <!--<br>   <br>   <br>-->   \`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('\nlet a = ``;\nlet b = ``;\nlet c = ``;\nlet d = ``;');
  delete process.env.MINIFY_HTML_COMMENTS;
});

test('removes HTML comments by default', () => {
  const source = `
let a = \`<!--   -->\`;
let b = \`<!--\n\n\n-->\`;
let c = \`<!--\t\t\t-->\`;
let d = \`   <!--<br>   <br>   <br>-->   \`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('\nlet a = ``;\nlet b = ``;\nlet c = ``;\nlet d = ``;');
});
test('removes HTML comments when keepComments is false', () => {
  const source = `
let a = \`<!--   -->\`;
let b = \`<!--\n\n\n-->\`;
let c = \`<!--\t\t\t-->\`;
let d = \`   <!--<br>   <br>   <br>-->   \`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates({ keepComments: false }), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('\nlet a = ``;\nlet b = ``;\nlet c = ``;\nlet d = ``;');
});
test('does not remove HTML comments when keepComments is true', () => {
  const source = `
let a = \`<!--   -->\`;
let b = \`<!--\n\n\n-->\`;
let c = \`<!--\t\t\t-->\`;
let d = \`   <!--<br>   <br>   <br>-->   \`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates({ keepComments: true }), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(
    '\nlet a = `<!-- -->`;\nlet b = `<!-- -->`;\nlet c = `<!-- -->`;\nlet d = `<!--<br><br><br>-->`;',
  );
});

// Module javascript

test('minifies module javascript', () => {
  const mockBuildResult = createMockBuildResult('export const a = `x   y`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe('export const a = `x y`;');
});

// JS sourcemaps

test('generates a new sourcemap', () => {
  const source = 'let a = `x   y`;';
  const map = new MagicString(source)
    .generateMap({
      hires: true,
      file: 'mock.js',
      source,
      includeContent: true,
    })
    .toString();
  const mockBuildResult = {
    outputFiles: [
      createMockBuildResult(source).outputFiles![0],
      createMockBuildResult(map, undefined, 'mock.js.map').outputFiles![0],
    ],
    errors: [],
    warnings: [],
    metafile: { inputs: {}, outputs: {} },
    mangleCache: {},
  };
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult, 1)).not.toBe('');
  expect(getOutput(mockBuildResult, 1)).not.toBe(map);
});

test('generated sourcemap is loosely valid', () => {
  const source = 'let a = `x   y`;';
  const map = new MagicString(source)
    .generateMap({
      hires: true,
      file: 'mock.js',
      source,
      includeContent: true,
    })
    .toString();
  const mockBuildResult = {
    outputFiles: [
      createMockBuildResult(source).outputFiles![0],
      createMockBuildResult(map, undefined, 'mock.js.map').outputFiles![0],
    ],
    errors: [],
    warnings: [],
    metafile: { inputs: {}, outputs: {} },
    mangleCache: {},
  };
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(mockBuildResult.outputFiles[1].path).toEndWith('mock.js.map');
  const returnedMap = JSON.parse(getOutput(mockBuildResult, 1)) as SourceMap;
  expect(returnedMap.version).toBe(3);
  expect(returnedMap.mappings).toBeTruthy();
});

// TODO:
// test('generated sourcemap is correct', () => {});

// Misc.

const mixedCodeSrc = `
/**
 * c1
 */

  "use strict";

  const a = \`x    y\`;
  let b = h\`
    x    y
  \`;

// c2

\tlet c = \`
    <div
      class="a"
      tabindex=-1

    >
      <a href="#"> abc </a>
      <a    href="#">def </a>
      <a href="#"   > hij</a>
    </div>
  \`;
  var d = h\`
    <br>
    \${\`<br>\`}
    \${\`<br>   \`}
    \${\`abc  \t\t<br>\`}
  \`;
`;
const mixedCodeMin = `
/**
 * c1
 */

  "use strict";

  const a = \`x y\`;
  let b = h\` x y \`;

// c2

\tlet c = \`<div class="a" tabindex=-1 ><a href="#"> abc </a><a href="#">def </a><a href="#" > hij</a></div>\`;
  var d = h\`<br>\${\`<br>\`} \${\`<br>\`} \${\`abc <br>\`} \`;
`;

test('returns correct result in complex code', () => {
  const mockBuildResult = createMockBuildResult(mixedCodeSrc);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  expect(getOutput(mockBuildResult)).toBe(mixedCodeMin);
});

test('minify matches minifyTemplates result in complex code', () => {
  const returned = minify(mixedCodeSrc);
  expect(returned.toString()).toBe(mixedCodeMin);
});

// NOOP

test('does not modify output when build write is true', () => {
  const source = `
let a = \`x   y\`;
let b = \`x\\n\\n\\ny\`;
let c = \`x\t\t\ty\`;
let d = \`   <br>   <br>   <br>   \`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult, { write: true });
  expect(getOutput(mockBuildResult)).toBe(source);
});
test('does not modify output when build write is undefined', () => {
  const source = `
let a = \`x   y\`;
let b = \`x\\n\\n\\ny\`;
let c = \`x\t\t\ty\`;
let d = \`   <br>   <br>   <br>   \`;`;
  const mockBuildResult = createMockBuildResult(source);
  // @ts-expect-error - undefined is the default value
  void esbuildTestHarness(minifyTemplates(), mockBuildResult, {
    write: undefined,
  });
  expect(getOutput(mockBuildResult)).toBe(source);
});
