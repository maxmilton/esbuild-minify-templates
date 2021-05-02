/* eslint-disable no-param-reassign */

// TODO: There's a chance code might use a template literal to construct a
// RegExp and this tool could break the regex... how to avoid? Options with
// exclude files filter?

import remapping from '@ampproject/remapping';
import { walk } from 'astray';
import type { BuildResult } from 'esbuild';
import fs from 'fs';
import MagicString from 'magic-string';
import { parse } from 'meriyah';
import path from 'path';

function handleErr(err?: Error | null) {
  if (err) throw err;
}

// function getCharLoc(source: string, line: number, column: number): number {
//   return (
//     source
//       .split('\n')
//       .slice(0, line - 1)
//       .join('\n').length + column
//   );
// }

/**
 * Minify template literal strings in `.js` files built by esbuild.
 */
export function minifyTemplates(buildResult: BuildResult): BuildResult {
  if (buildResult.outputFiles) {
    buildResult.outputFiles.forEach((file, fileIndex, outputFiles) => {
      if (path.extname(file.path) !== '.js') return;

      const src = file.text;
      const out = new MagicString(src);
      const ast = parse(src, {
        next: true,
        loc: true,
      });

      walk(ast, {
        TemplateElement(node) {
          const { start, end } = node.loc!;

          if (start.line !== end.line || start.column !== end.column) {
            // const startCharLoc = getCharLoc(src, start.line, start.column);
            // const endCharLoc = getCharLoc(src, end.line, end.column);

            // const startOffset = start.line === 1 ? 0 : 1;
            // const endOffset = end.line === 1 ? 0 : 1;

            const content = node.value.raw
              // reduce whitespace to a single space
              .replace(/\s+/gm, ' ')
              // remove space between tags
              .replace(/> </g, '><')
              // remove space between edge and start/end tags
              .replace(/^ </g, '<')
              .replace(/> $/g, '>');

            // out.overwrite(
            //   startCharLoc + startOffset,
            //   endCharLoc + endOffset,
            //   content,
            // );
            out.overwrite(node.start, node.end, content);
          }
        },
      });

      buildResult.outputFiles![fileIndex].contents = Buffer.from(
        out.toString(),
      );

      const matchingMapIndex = outputFiles.findIndex(
        (outputFile) => outputFile.path === `${file.path}.map`,
      );

      if (matchingMapIndex > -1) {
        const mapFile = outputFiles[matchingMapIndex];
        const remapped = remapping(
          [
            // our source map from minifying
            {
              ...out.generateDecodedMap({
                source: file.path,
                file: mapFile.path,
                hires: true,
              }),
              version: 3,
            },
            // esbuild generated source map
            mapFile.text,
          ],
          // don't load other source maps; referenced files are the original source
          () => null,
        );

        buildResult.outputFiles![matchingMapIndex].contents = Buffer.from(
          JSON.stringify(remapped),
        );
      }
    });
  }

  return buildResult;
}

export function writeFiles(buildResult: BuildResult): void {
  if (buildResult.outputFiles) {
    buildResult.outputFiles.forEach((file) => {
      fs.writeFile(file.path, file.contents, 'utf8', handleErr);
    });
  }
}
