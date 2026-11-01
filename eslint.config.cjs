const js = require('@eslint/js');
const globals = require('globals');
const react = require('eslint-plugin-react');
const hooks = require('eslint-plugin-react-hooks');
const publicDocs = require('./scripts/public-docs-rule.cjs');

module.exports = [
  { ignores: ['node_modules/**', 'media/bundle.*', 'dev_docs/local_only/**', 'reports/**'] },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,jsx,cjs,mjs}'],
    plugins: { standards: { rules: { 'public-docs': publicDocs } } },
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: globals.node },
    rules: {
      ...js.configs.recommended.rules,
      'standards/public-docs': 'error',
      // Only intentionally unused parameters/caught errors prefixed with an underscore are exempt.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['webview/**/*.{js,jsx}', '**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, acquireVsCodeApi: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': hooks },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
];
