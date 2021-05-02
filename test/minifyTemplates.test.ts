/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { BuildResult } from 'esbuild';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import MagicString, { SourceMap } from 'magic-string';
import { minifyTemplates } from '../src/index';
import { createMockBuildResult } from './utils';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes
const whitespaces = [
  [' ', 'space'],
  ['\f', ''],
  ['\n', 'new line'],
  ['\r', ''],
  ['\t', 'tab stop'],
  ['\v', ''],
  ['\u00a0', ''],
  ['\u1680', ''],
  ['\u2000', ''],
  ['\u2001', ''],
  ['\u2002', ''],
  ['\u2003', ''],
  ['\u2004', ''],
  ['\u2005', ''],
  ['\u2006', ''],
  ['\u2007', ''],
  ['\u2008', ''],
  ['\u2009', ''],
  ['\u200a', ''],
  ['\u2028', ''],
  ['\u2029', ''],
  ['\u202f', ''],
  ['\u205f', ''],
  ['\u3000', ''],
  ['\ufeff', ''],
];

// eslint-disable-next-line no-param-reassign, no-return-assign
const allWhitespace = whitespaces.reduce((text, [val]) => (text += val), '');

function getOutput(buildResult: BuildResult, index = 0) {
  return buildResult.outputFiles![index].contents.toString();
}

test('always returns buildResult', () => {
  const mockBuildResult1 = { errors: [], warnings: [] };
  const returned1 = minifyTemplates(mockBuildResult1);
  assert.equal(returned1, mockBuildResult1);
  assert.not.equal(returned1, {});

  const mockBuildResult2 = { a: 1, errors: [], warnings: [] };
  const returned2 = minifyTemplates(mockBuildResult2);
  assert.equal(returned2, mockBuildResult2);
  assert.not.equal(returned2, mockBuildResult1);

  const mockBuildResult3 = { outputFiles: [], errors: [], warnings: [] };
  const returned3 = minifyTemplates(mockBuildResult3);
  assert.equal(returned3, mockBuildResult3);
  assert.not.equal(returned3, mockBuildResult1);

  const mockBuildResult4 = createMockBuildResult('a');
  const returned4 = minifyTemplates(mockBuildResult4);
  assert.equal(returned4, mockBuildResult4);
  assert.not.equal(returned4, mockBuildResult3);
});

// Minification

whitespaces.forEach(([value, name]) => {
  test(`reduces single ${
    name || JSON.stringify(value)
  } to a single space`, () => {
    const mockBuildResult = createMockBuildResult(`let a = \`${value}\`;`);
    const returned = minifyTemplates(mockBuildResult);
    assert.is(getOutput(returned), 'let a = ` `;');
  });
  test(`reduces multiple ${
    name || JSON.stringify(value)
  }s to a single space`, () => {
    const mockBuildResult = createMockBuildResult(
      `let a = \`${value}${value}${value}\`;`,
    );
    const returned = minifyTemplates(mockBuildResult);
    assert.is(getOutput(returned), 'let a = ` `;');
  });
});

test('reduces all whitespaces to a single space', () => {
  const mockBuildResult = createMockBuildResult(
    `let a = \`${allWhitespace}\`;`,
  );
  const returned = minifyTemplates(mockBuildResult);
  assert.is(getOutput(returned), 'let a = ` `;');
});

test('removes single space between tags', () => {
  const mockBuildResult = createMockBuildResult('let a = `> <`;');
  const returned = minifyTemplates(mockBuildResult);
  assert.is(getOutput(returned), 'let a = `><`;');
});
test('removes multiple whitespace between tags', () => {
  const mockBuildResult = createMockBuildResult(
    `let a = \`>${allWhitespace}<\`;`,
  );
  const returned = minifyTemplates(mockBuildResult);
  assert.is(getOutput(returned), 'let a = `><`;');
});
test('removes space between start and <', () => {
  const mockBuildResult = createMockBuildResult('let a = ` <`;');
  const returned = minifyTemplates(mockBuildResult);
  assert.is(getOutput(returned), 'let a = `<`;');
});
test('removes multiple whitespace between start and <', () => {
  const mockBuildResult = createMockBuildResult(
    `let a = \`${allWhitespace}<\`;`,
  );
  const returned = minifyTemplates(mockBuildResult);
  assert.is(getOutput(returned), 'let a = `<`;');
});
test('removes space between > and end', () => {
  const mockBuildResult = createMockBuildResult('let a = `> `;');
  const returned = minifyTemplates(mockBuildResult);
  assert.is(getOutput(returned), 'let a = `>`;');
});
test('removes multiple whitespace between > and end', () => {
  const mockBuildResult = createMockBuildResult(
    `let a = \`>${allWhitespace}\`;`,
  );
  const returned = minifyTemplates(mockBuildResult);
  assert.is(getOutput(returned), 'let a = `>`;');
});

test('does not remove space between text and <', () => {
  const source = `
let a = \`text <\`;
let b = \`| <\`;
let c = \`© <\`;`;
  const mockBuildResult = createMockBuildResult(source);
  const returned = minifyTemplates(mockBuildResult);
  assert.is(getOutput(returned), source);
});
test('does not remove space between > and text', () => {
  const source = `
let a = \`> text\`;
let b = \`> |\`;
let b = \`> ©\`;`;
  const mockBuildResult = createMockBuildResult(source);
  const returned = minifyTemplates(mockBuildResult);
  assert.is(getOutput(returned), source);
});
test('does not remove space between > and >', () => {
  const source = 'let a = `> >`;';
  const mockBuildResult = createMockBuildResult(source);
  const returned = minifyTemplates(mockBuildResult);
  assert.is(getOutput(returned), source);
});
test('does not remove space between < and <', () => {
  const source = 'let a = `< <`;';
  const mockBuildResult = createMockBuildResult(source);
  const returned = minifyTemplates(mockBuildResult);
  assert.is(getOutput(returned), source);
});

// Raw template literals

test('correctly modifies template literal on only line', () => {
  const mockBuildResult = createMockBuildResult('let a = `x   y`;');
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), 'let a = `x y`;');
});
test('correctly modifies template literal on first line ', () => {
  const mockBuildResult = createMockBuildResult('let a = `x   y`;\n\n');
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), 'let a = `x y`;\n\n');
});
test('correctly modifies template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = `x   y`;\n\n');
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), '\nlet a = `x y`;\n\n');
});
test('correctly modifies template literal on tenth line', () => {
  const mockBuildResult = createMockBuildResult(
    '\n\n\n\n\n\n\n\n\nlet a = `x   y`;\n\n\n',
  );
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(
    getOutput(returned),
    '\n\n\n\n\n\n\n\n\nlet a = `x y`;\n\n\n',
  );
});
test('correctly modifies multi-line template literal on first line', () => {
  const mockBuildResult = createMockBuildResult('let a = `x\n\n\ny`;');
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), 'let a = `x y`;');
});
test('correctly modifies multi-line template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = `x\n\n\ny`;\n\n');
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), '\nlet a = `x y`;\n\n');
});

// Tagged template literals
// Note there should be no difference between raw and tagged template literals

test('correctly modifies tagged template literal on only line', () => {
  const mockBuildResult = createMockBuildResult('let a = h`x   y`;');
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), 'let a = h`x y`;');
});
test('correctly modifies tagged template literal on first line ', () => {
  const mockBuildResult = createMockBuildResult('let a = h`x   y`;\n\n');
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), 'let a = h`x y`;\n\n');
});
test('correctly modifies tagged template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = h`x   y`;\n\n');
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), '\nlet a = h`x y`;\n\n');
});
test('correctly modifies tagged template literal on tenth line', () => {
  const mockBuildResult = createMockBuildResult(
    '\n\n\n\n\n\n\n\n\nlet a = h`x   y`;\n\n\n',
  );
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(
    getOutput(returned),
    '\n\n\n\n\n\n\n\n\nlet a = h`x y`;\n\n\n',
  );
});
test('correctly modifies multi-line tagged template literal on first line', () => {
  const mockBuildResult = createMockBuildResult('let a = h`x\n\n\ny`;');
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), 'let a = h`x y`;');
});
test('correctly modifies multi-line tagged template literal on second line', () => {
  const mockBuildResult = createMockBuildResult('\nlet a = h`x\n\n\ny`;\n\n');
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), '\nlet a = h`x y`;\n\n');
});

// Nested template literals

test('correctly modify nested template literals', () => {
  const mockBuildResult = createMockBuildResult(`
let b = \`
\${\`x   \n\n\t\ty\`}
\${h\`x   y\`}
   \`;`);
  const returned = minifyTemplates(mockBuildResult);
  // eslint-disable-next-line no-template-curly-in-string
  assert.snapshot(getOutput(returned), '\nlet b = ` ${`x y`} ${h`x y`} `;');
});

// Plain strings

test('does not modify non-template string with single quotes', () => {
  const source = `
let a = 'x   y';
let b = 'x\\n\\n\\ny';
let c = 'x\t\t\ty';
let d = '   <br>   <br>   <br>   ';`;
  const mockBuildResult = createMockBuildResult(source);
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), source);
});
test('does not modify non-template string with double quotes', () => {
  const source = `
let a = "x   y";
let b = "x\\n\\n\\ny";
let c = "x\t\t\ty";
let d = "   <br>   <br>   <br>   ";`;
  const mockBuildResult = createMockBuildResult(source);
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(getOutput(returned), source);
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
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(
    getOutput(returned),
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
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(
    getOutput(returned),
    `
/* minify-templates-ignore */
let a = \`
\${\`x   y\`}
\${h\`x   y\`}
   \`;
let b = \` \${\`x y\`} \${h\`x y\`} \`;`,
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
  const returned = minifyTemplates(mockBuildResult);
  assert.is.not(getOutput(returned, 1), '');
  assert.not.equal(getOutput(returned, 1), map);
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
  const returned = minifyTemplates(mockBuildResult);
  assert.is(returned.outputFiles![1].path.endsWith('mock.js.map'), true);
  const returnedMap = JSON.parse(getOutput(returned, 1)) as SourceMap;
  assert.is(returnedMap.version, 3);
  assert.ok(returnedMap.mappings);
});

// TODO:
// test('generated sourcemap is correct', () => {});

// Misc.

test('returns correct result in complex code', () => {
  const mockBuildResult = createMockBuildResult(`
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
  `);
  const returned = minifyTemplates(mockBuildResult);
  assert.snapshot(
    getOutput(returned),
    `
  /**
   * c1
   */

    "use strict";

    const a = \`x y\`;
    let b = h\` x y \`;

// c2

\tlet c = \`<div class="a" tabindex=-1 ><a href="#"> abc </a><a href="#">def </a><a href="#" > hij</a></div>\`;
    var d = h\`<br>\${\`<br>\`} \${\`<br>\`} \${\`abc <br>\`} \`;
  `,
  );
});

test.run();
