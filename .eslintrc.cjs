const OFF = 0;
const ERROR = 2;

// eslint-disable-next-line max-len
// /** @type {import('eslint').Linter.Config & { parserOptions: import('@typescript-eslint/types').ParserOptions }} */
module.exports = {
  root: true,
  reportUnusedDisableDirectives: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    extraFileExtensions: ['.mjs', '.cjs'],
    project: ['./test/tsconfig.json'],
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'airbnb-base',
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': ERROR,
    'import/prefer-default-export': OFF,
    'no-restricted-syntax': OFF,
  },
};
