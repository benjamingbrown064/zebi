import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
const { heroui } = require('@heroui/react')

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Inter as primary — falls back to system-ui
        sans: ['Inter', 'system-ui', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // ── Zebi Design System tokens (Editorial Command v1.0) ─────────────
        // Primary action red (keep existing Zebi red — not changed per spec)
        primary:  { DEFAULT: '#DD3A44', dark: '#C7333D' },

        // Surface layers (warm white canvas system)
        surface:              '#fcf9f8', // base canvas
        'surface-low':        '#f6f3f2', // sidebar / section backgrounds
        'surface-container':  '#f0eded', // section containers
        'surface-high':       '#e8e4e4', // active state background
        'surface-highest':    '#e0dbdb', // secondary button bg
        'surface-card':       '#ffffff', // inner cards "pop" layer

        // Typography
        'on-surface':         '#1c1b1b', // primary text / headlines
        'on-surface-variant': '#5a5757', // secondary / metadata text
        'outline-variant':    '#c8c4c4', // ghost borders (use sparingly at low opacity)

        // Semantic
        'zebi-success':  '#006766', // tertiary (no SaaS blue)
        'zebi-red':      '#DD3A44', // alias for primary

        // Legacy aliases (keep for backward compat)
        'candy-apple': '#e82535',
        'crimson':     '#c92870',
        'cool-blue':   '#074f67',
        'deep-lake':   '#143548',
        'gravel':      '#5e5656',
        'wet-cement':  '#77848e',
        'cloudy':      '#f0f0f3',
        'bg-cream':    '#fcf9f8', // updated to warm surface
        'bg-paper':    '#FFFFFF',
        'text-asphalt':'#1c1b1b', // updated to charcoal
      },
      spacing: {
        gutter: '32px',
        // Design system spacing scale
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        card:   '14px',  // cards
        input:  '10px',  // inputs / buttons
        pill:   '9999px',
        sm:     '6px',
        md:     '8px',   // spec roundness-md
      },
      fontSize: {
        // Editorial type scale
        'display-lg': ['3.5rem',  { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['1.75rem', { lineHeight: '1.2',  letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['1.375rem',{ lineHeight: '1.3',  letterSpacing: '0',       fontWeight: '600' }],
        'body-lg':     ['1rem',    { lineHeight: '1.6',  letterSpacing: '0',       fontWeight: '400' }],
        'body-md':     ['0.875rem',{ lineHeight: '1.6',  letterSpacing: '0',       fontWeight: '400' }],
        'label-md':    ['0.75rem', { lineHeight: '1.4',  letterSpacing: '0.05em',  fontWeight: '500' }],
      },
      boxShadow: {
        // Ambient only — never opaque black
        'card':       '0 1px 3px rgba(28,27,27,0.06)',
        'card-hover': '0 4px 12px rgba(28,27,27,0.08)',
        'float':      '0 20px 40px rgba(28,27,27,0.06)',
        'subtle':     '0 1px 2px rgba(28,27,27,0.04)',
      },
      backgroundImage: {
        // Primary CTA gradient — "soul" for the red button
        'primary-gradient': 'linear-gradient(135deg, #DD3A44 0%, #C7333D 100%)',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    heroui({
      layout: {
        radius: {
          small:  '6px',
          medium: '10px',
          large:  '14px',
        },
      },
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: '#DD3A44',
              foreground: '#FFFFFF',
              50:  '#fef2f3',
              100: '#fee5e8',
              200: '#fccfd5',
              300: '#f9a3ad',
              400: '#f57a8a',
              500: '#DD3A44',
              600: '#C7333D',
              700: '#a82835',
              800: '#8b2230',
              900: '#77202c',
            },
            secondary: {
              DEFAULT: '#e0dbdb',
              foreground: '#1c1b1b',
            },
            background: '#fcf9f8',
            foreground: '#1c1b1b',
          },
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: '#DD3A44',
              foreground: '#FFFFFF',
            },
            background: '#1c1b1b',
            foreground: '#fcf9f8',
          },
        },
      },
    }),
  ],
}
export default config
