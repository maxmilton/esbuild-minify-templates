/* eslint-disable consistent-return, no-param-reassign */

import remapping from '@ampproject/remapping';
import { ESTreeMap, SKIP, walk } from 'astray';
import type { BuildResult } from 'esbuild';
import type { SourceLocation } from 'estree';
import fs from 'fs';
import MagicString from 'magic-string';
import { parse } from 'meriyah';
import path from 'path';

type ParsedNode<K extends keyof ESTreeMap> = ESTreeMap[K] & {
  // via meriyah "loc" option
  loc: SourceLocation;
  // via meriyah "ranges" option
  start: number;
  end: number;
};

export function encodeUTF8(text: string): Uint8Array {
  let buffer: Uint8Array = Buffer.from(text);
  if (!(buffer instanceof Uint8Array)) {
    buffer = new Uint8Array(buffer);
  }
  return buffer;
}

export function decodeUTF8(bytes: Uint8Array): string {
  const { buffer, byteOffset, byteLength } = bytes;
  return Buffer.from(buffer, byteOffset, byteLength).toString();
}

/**
 * Minify template literal strings in `.js` files built by esbuild.
 */
export function minifyTemplates(buildResult: BuildResult): BuildResult {
  if (buildResult.outputFiles) {
    buildResult.outputFiles.forEach((file, fileIndex, outputFiles) => {
      if (path.extname(file.path) !== '.js') return;

      const src = decodeUTF8(file.contents);
      const out = new MagicString(src);
      const ignoreLines: number[] = [];
      const ast = parse(src, {
        next: true,
        loc: true,
        ranges: true,

        onComment(type, value, _start, _end, loc) {
          if (
            type === 'MultiLine'
            && value.trim() === 'minify-templates-ignore'
          ) {
            ignoreLines.push(loc.end.line + 1);
          }
        },
      });

      walk(ast, {
        TemplateLiteral(node: ParsedNode<'TemplateLiteral'>) {
          // don't modify current or any nested templates if it's ignored
          if (ignoreLines.includes(node.loc.start.line)) return SKIP;
        },
        TemplateElement(node: ParsedNode<'TemplateElement'>) {
          const { start, end } = node.loc;

          if (start.line !== end.line || start.column !== end.column) {
            const content = node.value.raw
              // reduce whitespace to a single space
              .replace(/\s+/gm, ' ')
              // remove space between tags
              .replace(/> </g, '><')
              // remove space between edge and start/end tags
              .replace(/^ </g, '<')
              .replace(/> $/g, '>');

            out.overwrite(node.start, node.end, content);
          }
        },
      });

      outputFiles[fileIndex].contents = encodeUTF8(out.toString());

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
            decodeUTF8(mapFile.contents),
          ],
          // don't load other source maps; referenced files are the original source
          () => null,
        );

        outputFiles[matchingMapIndex].contents = encodeUTF8(
          remapped.toString(),
        );
      }
    });
  }

  return buildResult;
}

export async function writeFiles(buildResult: BuildResult): Promise<void> {
  if (buildResult.outputFiles) {
    const results: Promise<void>[] = [];

    buildResult.outputFiles.forEach((file) => {
      results.push(fs.promises.writeFile(file.path, file.contents, 'utf8'));
    });

    await Promise.all(results);
  }
}
