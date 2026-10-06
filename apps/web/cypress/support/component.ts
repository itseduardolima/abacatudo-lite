import { mount } from 'cypress/react'
import '@fontsource-variable/inter'
import '../../src/styles/globals.css'

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

Cypress.Commands.add('mount', mount)
