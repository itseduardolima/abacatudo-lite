import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

// Shared TypeScript rules — apps add their own framework-specific config on top.
export const baseConfig = tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, prettier, {
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Regra dura do projeto (04-padroes-codigo § TypeScript): nunca `any`.
    '@typescript-eslint/no-explicit-any': 'error',
  },
})
