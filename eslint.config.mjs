import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: [
      'node_modules',
      'coverage',
      'dist',
      '.github'
    ]
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'warn',
      'no-console': 'off'
    }
  }
]