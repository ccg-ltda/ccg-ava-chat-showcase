import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

/**
 * Lints what this repository writes in JavaScript (mock server, shim, demo layer, tests). Not linted here: `src/ava` (AVA Platform's own frontend,
 * copied as it is), the widget script, and the few .ts files, which `tsc` type-checks (`npm run typecheck`).
 */
export default [
  { ignores: ['dist', 'src/ava/**', 'public/widget/**', '**/*.ts'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node, route: 'readonly' }, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'react-hooks': reactHooks, react },
    rules: { ...reactHooks.configs.recommended.rules, 'react/jsx-uses-vars': 'error', 'react/jsx-uses-react': 'off', 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] },
  },
];
