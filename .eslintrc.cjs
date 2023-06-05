const OFF = 0;
const WARN = 1;
const ERROR = 2;

/** @type {import('eslint/lib/shared/types').ConfigData & { parserOptions: import('@typescript-eslint/types').ParserOptions }} */
module.exports = {
  root: true,
  reportUnusedDisableDirectives: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'airbnb-base',
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:unicorn/recommended',
    'prettier',
  ],
  plugins: ['prettier'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': ERROR,
    'import/prefer-default-export': OFF,
    'no-restricted-syntax': OFF,
    'no-void': OFF,
    'prettier/prettier': WARN,
    'unicorn/filename-case': OFF,
    'unicorn/no-abusive-eslint-disable': WARN,
    'unicorn/no-null': OFF,
    'unicorn/prefer-module': WARN,
    'unicorn/prefer-node-protocol': OFF, // incompatible with older node versions
    'unicorn/prefer-string-replace-all': OFF, // incompatible with older node versions
    'unicorn/prefer-top-level-await': WARN,
    'unicorn/prevent-abbreviations': OFF,
  },
};
