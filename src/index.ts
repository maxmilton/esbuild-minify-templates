import remapping from '@ampproject/remapping';
import { ESTreeMap, SKIP, walk } from 'astray';
import type { Plugin } from 'esbuild';
import type { SourceLocation } from 'estree';
import fs from 'fs/promises';
import MagicString from 'magic-string';
import { parse } from 'meriyah';
import path from 'path';

type ESTreeMapExtra<M = ESTreeMap> = {
  [K in keyof M]: M[K] & {
    // Added via meriyah "loc" option
    loc: SourceLocation;
    // Added via meriyah "ranges" option
    start: number;
    end: number;
  };
};

interface MinifyOptions {
  taggedOnly?: boolean;
  keepComments?: boolean;
}

// Same encode/decode as esbuild
// https://github.com/evanw/esbuild/blob/4dfd1b6ae07892f1e8f5a6712fc67301e19a1b24/lib/shared/stdio_protocol.ts#L353-L391
const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const encodeUTF8 = (text: string): Uint8Array => encoder.encode(text);
export const decodeUTF8 = (bytes: Uint8Array): string => decoder.decode(bytes);

export function minify(code: string, opts: MinifyOptions = {}): MagicString {
  const out = new MagicString(code);
  const ignoreLines: number[] = [];
  const ast = parse(code, {
    next: true,
    loc: true,
    ranges: true,
    module: true,

    onComment(type, value, _start, _end, loc) {
      if (
        type === 'MultiLine'
        && value.trim() === '! minify-templates-ignore'
      ) {
        ignoreLines.push(loc.end.line + 1);
      }
    },
  });

  walk<typeof ast, void, ESTreeMapExtra>(ast, {
    TemplateLiteral(node) {
      return ignoreLines.includes(node.loc.start.line)
        || (opts.taggedOnly
          && node.path!.parent
          && node.path!.parent.type !== 'TaggedTemplateExpression')
        ? SKIP
        : undefined;
    },
    TemplateElement(node) {
      const { start, end } = node.loc;

      if (start.line !== end.line || start.column !== end.column) {
        let content = node.value.raw
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

        if (!opts.keepComments) {
          content = content.replace(/<!--.*?-->/gs, '');
        }

        out.overwrite(node.start, node.end, content);
      }
    },
  });

  return out;
}

export const minifyTemplates = (opts: MinifyOptions = {}): Plugin => ({
  name: 'minify-templates',
  setup(build) {
    if (build.initialOptions.write !== false) return;

    build.onEnd((result) => {
      result.outputFiles!.forEach((file, fileIndex, outputFiles) => {
        if (path.extname(file.path) !== '.js') return;

        const src = decodeUTF8(file.contents);
        const out = minify(src, opts);

        // eslint-disable-next-line no-param-reassign
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

          // eslint-disable-next-line no-param-reassign
          outputFiles[matchingMapIndex].contents = encodeUTF8(
            remapped.toString(),
          );
        }
      });
    });
  },
});

export const writeFiles = (): Plugin => ({
  name: 'write-files',
  setup(build) {
    if (build.initialOptions.write !== false) return;

    build.onEnd(
      (result) => Promise.all(
        result.outputFiles!.map((file) => fs
          .mkdir(path.dirname(file.path), { recursive: true })
          .then(() => fs.writeFile(file.path, file.contents, 'utf8'))),
      ) as unknown as Promise<void>, // as long as we return a Promise it's fine
    );
  },
});
