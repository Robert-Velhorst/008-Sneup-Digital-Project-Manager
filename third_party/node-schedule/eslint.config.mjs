import js from '@eslint/js';
import globals from 'globals';
import stylistic from '@stylistic/eslint-plugin';

export default [
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: globals.node },
    plugins: { '@stylistic': stylistic },
    rules: {
      eqeqeq: ['error', 'smart'],
      '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
      'no-constant-condition': 'off',
      'no-redeclare': 'warn',
      'no-underscore-dangle': 'off',
      'no-use-before-define': ['warn', { functions: false, classes: true, variables: true }],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/space-before-blocks': 'error',
      strict: 'error',
      'no-empty': 'off',
      'require-yield': 'off'
    }
  },
  { files: ['test/**/*.js'], rules: { '@stylistic/quotes': 'off' } }
];
