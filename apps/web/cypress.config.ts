import { defineConfig } from 'cypress'

const baseUrl = process.env.CYPRESS_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    defaultCommandTimeout: 10_000,
  },
  component: {
    devServer: { framework: 'next', bundler: 'webpack' },
    specPattern: 'src/**/*.cy.tsx',
    supportFile: 'cypress/support/component.ts',
  },
})
