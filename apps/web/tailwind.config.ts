import type { Config } from 'tailwindcss'

// Cores/raios/sombras apontam para CSS variables semânticas de src/styles/theme.css
// (apps/web/docs/DESIGN_SYSTEM.md). Nunca hex em componente.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-ink': 'var(--color-primary-ink)',
        ink: 'var(--color-ink)',
        text: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        tint: 'var(--color-surface-tint)',
        inverse: 'var(--color-inverse)',
        'inverse-2': 'var(--color-inverse-2)',
        'on-inverse': 'var(--color-on-inverse)',
        'on-inverse-accent': 'var(--color-on-inverse-accent)',
        'on-inverse-muted': 'var(--color-on-inverse-muted)',
        'on-inverse-hairline': 'var(--color-on-inverse-hairline)',
        'on-inverse-marker': 'var(--color-on-inverse-marker)',
        'accent-tint-on-inverse': 'var(--color-accent-tint-on-inverse)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        accent: 'var(--color-accent)',
        danger: 'var(--color-danger)',
        scrim: 'var(--color-scrim)',
      },
      borderRadius: {
        pill: 'var(--radius-pill)',
        card: 'var(--radius-card)',
        'card-lg': 'var(--radius-card-lg)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        hair: 'var(--shadow-hair)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      fontFamily: {
        body: 'var(--font-body)',
        display: 'var(--font-display)',
      },
      minHeight: { control: 'var(--control-height)' },
    },
  },
  plugins: [],
}

export default config
