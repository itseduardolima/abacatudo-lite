import { FlatCompat } from '@eslint/eslintrc'
import prettier from 'eslint-config-prettier'

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

export default [
  { ignores: ['.next/**', 'cypress/videos/**', 'cypress/screenshots/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  prettier,
  {
    // Regra dura do projeto (04-padroes-codigo § TypeScript): nunca `any`.
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    // Padrão idiomático do Cypress para estender tipos globais.
    files: ['cypress/support/**/*.ts'],
    rules: { '@typescript-eslint/no-namespace': 'off' },
  },
  {
    files: ['*.config.mjs'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
]
