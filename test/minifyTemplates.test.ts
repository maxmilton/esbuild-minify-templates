/* eslint-disable @typescript-eslint/no-non-null-assertion, no-void */

import type { BuildResult } from 'esbuild';
import MagicString, { SourceMap } from 'magic-string';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { decodeUTF8, minify, minifyTemplates } from '../src/index';
import { createMockBuildResult, esbuildTestHarness } from './utils';

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
  ['\u00a0', 'no-break space'], // &nbsp;
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
  ['\u200a', 'hair space'],
  ['\u2028', 'line separator'],
  ['\u2029', 'paragraph separator'],
  ['\u202f', 'narrow no-break space'],
  ['\u205f', 'medium mathematical space'],
  ['\u3000', 'ideographic space'],
  ['\ufeff', 'zero width no-break space'],

  // XXX: Not whitespace but worth pointing out there is also:
  // ['\u200b', 'zero-width space'],
];

// eslint-disable-next-line no-param-reassign, no-return-assign
const allWhitespace = whitespaces.reduce((text, [val]) => (text += val), '');

function getOutput(buildResult: BuildResult, index = 0) {
  return decodeUTF8(buildResult.outputFiles![index].contents);
}

// Minification

whitespaces.forEach(([value, name]) => {
  test(`reduces single ${
    name || JSON.stringify(value)
  } to a single space`, () => {
    const mockBuildResult = createMockBuildResult(`let a = \`${value}\`;`);
    void esbuildTestHarness(minifyTemplates(), mockBuildResult);
    assert.is(getOutput(mockBuildResult), 'let a = ` `;');
  });
  test(`reduces multiple ${
    name || JSON.stringify(value)
  }s to a single space`, () => {
    const mockBuildResult = createMockBuildResult(
      `let a = \`${value}${value}${value}\`;`,
    );
    void esbuildTestHarness(minifyTemplates(), mockBuildResult);
    assert.is(getOutput(mockBuildResult), 'let a = ` `;');
  });
});

test('reduces all whitespaces to a single space', () => {
  const mockBuildResult = createMockBuildResult(
    `let a = \`${allWhitespace}\`;`,
  );
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), 'let a = ` `;');
});
test('does not reduce all whitespaces when escaped', () => {
  const escapedWhitespaces = "' '' '' '\\f\\n\\r\\t\\v\\u00a0\\u1680\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff";
  const source = `let a = \`${escapedWhitespaces}\`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), source);
});

test('removes single space between tags', () => {
  const mockBuildResult = createMockBuildResult('let a = `> <`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), 'let a = `><`;');
});
test('removes multiple whitespace between tags', () => {
  const mockBuildResult = createMockBuildResult(
    `let a = \`>${allWhitespace}<\`;`,
  );
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), 'let a = `><`;');
});
test('removes space between start and <', () => {
  const mockBuildResult = createMockBuildResult('let a = ` <`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), 'let a = `<`;');
});
test('removes multiple whitespace between start and <', () => {
  const mockBuildResult = createMockBuildResult(
    `let a = \`${allWhitespace}<\`;`,
  );
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), 'let a = `<`;');
});
test('removes space between > and end', () => {
  const mockBuildResult = createMockBuildResult('let a = `> `;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), 'let a = `>`;');
});
test('removes multiple whitespace between > and end', () => {
  const mockBuildResult = createMockBuildResult(
    `let a = \`>${allWhitespace}\`;`,
  );
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), 'let a = `>`;');
});

test('does not remove space between text and <', () => {
  const source = `
let a = \`text <\`;
let b = \`| <\`;
let c = \`© <\`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), source);
});
test('does not remove space between > and text', () => {
  const source = `
let a = \`> text\`;
let b = \`> |\`;
let b = \`> ©\`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), source);
});
test('does not remove space between > and >', () => {
  const source = 'let a = `> >`;';
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), source);
});
test('does not remove space between < and <', () => {
  const source = 'let a = `< <`;';
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(getOutput(mockBuildResult), source);
});

// Raw template literals

test('correctly modifies template literal on only line', () => {
  const mockBuildResult = createMockBuildResult('let a = `x   y`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.snapshot(getOutput(mockBuildResult), 'let a = `x y`;');
});
test('correctly modifies template literal on first line ', () => {
  const mockBuildResult = createMockBuildResult('let a = `x   y`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(getOutput(mockBuildResult), 'let a = `x y`;\n\n');
});
test('correctly modifies template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = `x   y`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(getOutput(mockBuildResult), '\nlet a = `x y`;\n\n');
});
test('correctly modifies template literal on tenth line', () => {
  const mockBuildResult = createMockBuildResult(
    '\n\n\n\n\n\n\n\n\nlet a = `x   y`;\n\n\n',
  );
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(
    getOutput(mockBuildResult),
    '\n\n\n\n\n\n\n\n\nlet a = `x y`;\n\n\n',
  );
});
test('correctly modifies multi-line template literal on first line', () => {
  const mockBuildResult = createMockBuildResult('let a = `x\n\n\ny`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(getOutput(mockBuildResult), 'let a = `x y`;');
});
test('correctly modifies multi-line template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = `x\n\n\ny`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(getOutput(mockBuildResult), '\nlet a = `x y`;\n\n');
});

// Tagged template literals
// Note there should be no difference between raw and tagged template literals

test('correctly modifies tagged template literal on only line', () => {
  const mockBuildResult = createMockBuildResult('let a = h`x   y`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.snapshot(getOutput(mockBuildResult), 'let a = h`x y`;');
});
test('correctly modifies tagged template literal on first line ', () => {
  const mockBuildResult = createMockBuildResult('let a = h`x   y`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(getOutput(mockBuildResult), 'let a = h`x y`;\n\n');
});
test('correctly modifies tagged template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = h`x   y`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(getOutput(mockBuildResult), '\nlet a = h`x y`;\n\n');
});
test('correctly modifies tagged template literal on tenth line', () => {
  const mockBuildResult = createMockBuildResult(
    '\n\n\n\n\n\n\n\n\nlet a = h`x   y`;\n\n\n',
  );
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(
    getOutput(mockBuildResult),
    '\n\n\n\n\n\n\n\n\nlet a = h`x y`;\n\n\n',
  );
});
test('correctly modifies multi-line tagged template literal on first line', () => {
  const mockBuildResult = createMockBuildResult('let a = h`x\n\n\ny`;');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(getOutput(mockBuildResult), 'let a = h`x y`;');
});
test('correctly modifies multi-line tagged template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = h`x\n\n\ny`;\n\n');
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(getOutput(mockBuildResult), '\nlet a = h`x y`;\n\n');
});

// Nested template literals

test('correctly modify nested template literals', () => {
  const mockBuildResult = createMockBuildResult(`
let b = \`
\${\`x   \n\n\t\ty\`}
\${h\`x   y\`}
   \`;`);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.snapshot(
    getOutput(mockBuildResult),
    // eslint-disable-next-line no-template-curly-in-string
    '\nlet b = ` ${`x y`} ${h`x y`} `;',
  );
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
  assert.fixture(getOutput(mockBuildResult), source);
});
test('does not modify non-template string with double quotes', () => {
  const source = `
let a = "x   y";
let b = "x\\n\\n\\ny";
let c = "x\t\t\ty";
let d = "   <br>   <br>   <br>   ";`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(getOutput(mockBuildResult), source);
});

// "Ignore comment" feature

test('does not modify template literals with an ignore comment', () => {
  const mockBuildResult = createMockBuildResult(`
/* minify-templates-ignore */
let re1 = new RegExp(\`   <-- \${commentMsg}\`, 'gm');
let re2 = new RegExp(\`   <-- \${commentMsg}\`, 'gm');

/* minify-templates-ignore */
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
  assert.fixture(
    getOutput(mockBuildResult),
    `
/* minify-templates-ignore */
let re1 = new RegExp(\`   <-- \${commentMsg}\`, 'gm');
let re2 = new RegExp(\`<-- \${commentMsg}\`, 'gm');

/* minify-templates-ignore */
codeEditor.setContent(\`
  body {
    font-size: 20px;
    color: coral;
  }
\`);
codeEditor.setContent(\` body { font-size: 20px; color: coral; } \`);`,
  );
});

test('does not modify nested template literals when parent has an ignore comment', () => {
  const mockBuildResult = createMockBuildResult(`
/* minify-templates-ignore */
let a = \`
\${\`x   y\`}
\${h\`x   y\`}
   \`;
let b = \`
\${\`x   y\`}
\${h\`x   y\`}
   \`;`);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(
    getOutput(mockBuildResult),
    `
/* minify-templates-ignore */
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
  void esbuildTestHarness(
    minifyTemplates({ taggedOnly: true }),
    mockBuildResult,
  );
  assert.fixture(
    getOutput(mockBuildResult),
    `
let a = h\`x y\`;
let b = h\`x y\`;
let c = h\`x y\`;
let d = h\`<br><br><br>\`;`,
  );
});

test('does not modify non-tagged template literals when taggedOnly is true', () => {
  const source = `
let a = \`x   y\`;
let b = \`x\n\n\ny\`;
let c = \`x\t\t\ty\`;
let d = \`   <br>   <br>   <br>   \`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(
    minifyTemplates({ taggedOnly: true }),
    mockBuildResult,
  );
  assert.fixture(getOutput(mockBuildResult), source);
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
  assert.fixture(
    getOutput(mockBuildResult),
    '\nlet a = ``;\nlet b = ``;\nlet c = ``;\nlet d = ``;',
  );
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
  assert.fixture(
    getOutput(mockBuildResult),
    '\nlet a = ``;\nlet b = ``;\nlet c = ``;\nlet d = ``;',
  );
});
test('removes HTML comments when keepComments is false', () => {
  const source = `
let a = \`<!--   -->\`;
let b = \`<!--\n\n\n-->\`;
let c = \`<!--\t\t\t-->\`;
let d = \`   <!--<br>   <br>   <br>-->   \`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(
    minifyTemplates({ keepComments: false }),
    mockBuildResult,
  );
  assert.fixture(
    getOutput(mockBuildResult),
    '\nlet a = ``;\nlet b = ``;\nlet c = ``;\nlet d = ``;',
  );
});
test('does not remove HTML comments when keepComments is true', () => {
  const source = `
let a = \`<!--   -->\`;
let b = \`<!--\n\n\n-->\`;
let c = \`<!--\t\t\t-->\`;
let d = \`   <!--<br>   <br>   <br>-->   \`;`;
  const mockBuildResult = createMockBuildResult(source);
  void esbuildTestHarness(
    minifyTemplates({ keepComments: true }),
    mockBuildResult,
  );
  assert.fixture(
    getOutput(mockBuildResult),
    '\nlet a = `<!-- -->`;\nlet b = `<!-- -->`;\nlet c = `<!-- -->`;\nlet d = `<!--<br><br><br>-->`;',
  );
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
  };
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is.not(getOutput(mockBuildResult, 1), '');
  assert.not.equal(getOutput(mockBuildResult, 1), map);
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
  };
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.is(mockBuildResult.outputFiles[1].path.endsWith('mock.js.map'), true);
  const returnedMap = JSON.parse(getOutput(mockBuildResult, 1)) as SourceMap;
  assert.is(returnedMap.version, 3);
  assert.ok(returnedMap.mappings);
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
  assert.fixture(getOutput(mockBuildResult), mixedCodeMin);
});

test('minify matches minifyTemplates result in complex code', () => {
  const returned = minify(mixedCodeSrc);
  assert.fixture(returned.toString(), mixedCodeMin);
});

// `stage1` templates (`h` tagged template literals)

test('removes space around stage1 node ref tag', () => {
  const mockBuildResult = createMockBuildResult(
    'let view = h`<div> #a </div>`;',
  );
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.snapshot(getOutput(mockBuildResult), 'let view = h`<div>#a</div>`;');
});

test('removes space before stage1 node ref tag in nested HTML tag', () => {
  const mockBuildResult = createMockBuildResult(`
    let view = h\`
      <div>
        <br> #a
      </div>
    \`;`);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.snapshot(
    getOutput(mockBuildResult),
    '\nlet view = h`<div><br>#a</div>`;',
  );
});

test('removes space after stage1 node ref tag in nested HTML tag', () => {
  const mockBuildResult = createMockBuildResult(`
    let view = h\`
      <div>
        #a <br>
      </div>
    \`;`);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.snapshot(
    getOutput(mockBuildResult),
    '\nlet view = h`<div>#a<br></div>`;',
  );
});

test('does not remove space around stage1 node ref tag with invalid ref', () => {
  const mockBuildResult = createMockBuildResult(
    ' let view = h`<div> #a b </div>`;',
  );
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.snapshot(
    getOutput(mockBuildResult),
    'let view = h`<div> #a b </div>`;',
  );
});

const stage1TemplateSrc = `
let view = h\`
  <header>
    <nav>
      <!-- comm -->

      <h1 #title></h1>

      <a href=#>
        #link1
      </a>
      <a href=# #a >
        #link2
      </a>
      <a href=#>   #link3 </a>

      <div>
        #not a ref
      </div>
    </nav>
  </header>
\`;`;
const stage1TemplateMin = '\nlet view = h`<header><nav><h1 #title></h1><a href=#>#link1</a><a href=# #a >#link2</a><a href=#>#link3</a><div> #not a ref </div></nav></header>`;';

test('removes spaces correctly in complex stage1 template', () => {
  const mockBuildResult = createMockBuildResult(stage1TemplateSrc);
  void esbuildTestHarness(minifyTemplates(), mockBuildResult);
  assert.fixture(getOutput(mockBuildResult), stage1TemplateMin);
});

test('minify matches minifyTemplates result in complex stage1 template', () => {
  const returned = minify(stage1TemplateSrc);
  assert.fixture(returned.toString(), stage1TemplateMin);
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
  assert.fixture(getOutput(mockBuildResult), source);
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
  assert.fixture(getOutput(mockBuildResult), source);
});

test.run();
