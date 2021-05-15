/* eslint-disable consistent-return, no-param-reassign */

import remapping from '@ampproject/remapping';
import { ESTreeMap, SKIP, walk } from 'astray';
import fs from 'fs';
import MagicString from 'magic-string';
import { parse } from 'meriyah';
import path from 'path';
import type { SourceLocation } from 'estree';
import type { BuildResult } from 'esbuild';

type ESTreeMapExtra<M = ESTreeMap> = {
  [K in keyof M]: M[K] & {
    // added via meriyah "loc" option
    loc: SourceLocation;
    // added via meriyah "ranges" option
    start: number;
    end: number;
  };
};

// Same encode/decode as esbuild
// https://github.com/evanw/esbuild/blob/4dfd1b6ae07892f1e8f5a6712fc67301e19a1b24/lib/shared/stdio_protocol.ts#L353-L391
const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const encodeUTF8 = (text: string): Uint8Array => encoder.encode(text);
export const decodeUTF8 = (bytes: Uint8Array): string => decoder.decode(bytes);

export function minify(code: string): MagicString {
  const out = new MagicString(code);
  const ignoreLines: number[] = [];
  const ast = parse(code, {
    next: true,
    loc: true,
    ranges: true,

    // XXX: Comments are only available when esbuild has minify as !true
    onComment(type, value, _start, _end, loc) {
      if (type === 'MultiLine' && value.trim() === 'minify-templates-ignore') {
        ignoreLines.push(loc.end.line + 1);
      }
    },
  });

  walk<typeof ast, void, ESTreeMapExtra>(ast, {
    TemplateLiteral(node) {
      // don't modify current or any nested templates if it's ignored
      if (ignoreLines.includes(node.loc.start.line)) return SKIP;

      if (
        process.env.MINIFY_TAGGED_TEMPLATES_ONLY
        && node.path!.parent
        && node.path!.parent.type !== 'TaggedTemplateExpression'
      ) {
        return SKIP;
      }
    },
    TemplateElement(node) {
      const { start, end } = node.loc;

      if (start.line !== end.line || start.column !== end.column) {
        const content = node.value.raw
          // reduce whitespace to a single space
          .replace(/\s+/gm, ' ')
          // remove space between tags
          .replace(/> </g, '><')
          // remove space between edge and start/end tags
          .replace(/^ </g, '<')
          .replace(/> $/g, '>')
          // remove space around stage1 "node ref tags"
          // https://github.com/MaxMilton/stage1
          .replace(/> #(\w+) </g, '>#$1<');

        out.overwrite(node.start, node.end, content);
      }
    },
  });

  return out;
}

/**
 * Minify template literal strings in `.js` files built by esbuild.
 */
export function minifyTemplates(buildResult: BuildResult): BuildResult {
  if (buildResult.outputFiles) {
    buildResult.outputFiles.forEach((file, fileIndex, outputFiles) => {
      if (path.extname(file.path) !== '.js') return;

      const src = decodeUTF8(file.contents);
      const out = minify(src);

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
