// Configuration ESLint minimale (optionnelle) : npx eslint .
export default [
  {
    files: ['**/*.js', '**/*.mjs'],
    ignores: ['vendor/**'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly', history: 'readonly',
        localStorage: 'readonly', crypto: 'readonly', Intl: 'readonly', URL: 'readonly', Blob: 'readonly', File: 'readonly',
        requestAnimationFrame: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
        console: 'readonly', process: 'readonly', self: 'readonly', caches: 'readonly', fetch: 'readonly', Request: 'readonly', Response: 'readonly', EventTarget: 'readonly', Event: 'readonly', globalThis: 'readonly', matchMedia: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none' }],
      'no-undef': 'error',
    },
  },
  { ignores: ['vendor/**', 'e2e-output/**'] },
];
