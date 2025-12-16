const { defineConfig } = require('eslint/config')
const { FlatCompat } = require('@eslint/eslintrc')
const tsParser = require('@typescript-eslint/parser')
const typescriptEslintEslintPlugin = require('@typescript-eslint/eslint-plugin')
const globals = require('globals')
const js = require('@eslint/js')

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

module.exports = defineConfig([
  {

    files: ['tests/**/*.ts', 'scripts/**/*.ts'],
    ignores: ['**/node_modules', '**/dist', '**/target', '**/docs'],

    languageOptions: {
      parser: tsParser,
      sourceType: 'module',

      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
      },

      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },

    plugins: {
      '@typescript-eslint': typescriptEslintEslintPlugin,
    },

    extends: compat.extends('plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'),

    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off'
    },
  },
])
