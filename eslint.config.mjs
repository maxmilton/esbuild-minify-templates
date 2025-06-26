import eslint from '@eslint/js';
import mm from '@maxmilton/eslint-config';
import unicorn from 'eslint-plugin-unicorn';
import ts from 'typescript-eslint';

const OFF = 0;
const WARN = 1;
const ERROR = 2;

export default ts.config(
  eslint.configs.recommended,
  ...ts.configs.strictTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  unicorn.configs.recommended,
  mm.configs.recommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: ERROR,
    },
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'unicorn/import-style': OFF,
      'unicorn/prefer-global-this': OFF, // prefer to clearly separate Bun and DOM
      'unicorn/prefer-node-protocol': OFF, // incompatible with older node versions
      'unicorn/prefer-string-replace-all': OFF, // incompatible with older node versions
      'unicorn/prefer-top-level-await': WARN, // incompatible with older node versions
    },
  },
  {
    ignores: ['**/*.bak', 'coverage', 'dist'],
  },
);
