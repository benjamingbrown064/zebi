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
        // ── Zebi Design System tokens (Monolith Editorial) ─────────────────

        // Surface layers — cool neutral monochrome
        surface:              '#F9F9F9',   // base canvas
        'surface-low':        '#F3F3F3',   // sidebar, section backgrounds
        'surface-card':       '#FFFFFF',   // elevated card layer
        'surface-invert':     '#1A1C1C',   // inverted hero tiles

        // Typography
        'on-surface':         '#1A1C1C',   // primary text
        'on-surface-variant': '#474747',   // secondary / metadata
        'on-surface-muted':   '#A3A3A3',   // ghost / placeholder

        // Borders
        outline:              '#C6C6C6',

        // Primary action — pure black
        primary: { DEFAULT: '#000000', hover: '#1A1C1C' },

        // Brand — logo + critical badges only
        brand:   { DEFAULT: '#DD3A44', dark: '#C7333D' },

        // Semantic (minimal — monochrome preferred)
        success: '#15803D',
        warning: '#92400E',
        danger:  '#B91C1C',

        // Legacy compat
        'surface-container':  '#F3F3F3',
        'surface-high':       '#E5E5E5',
        'surface-highest':    '#D4D4D4',
        'on-surface-variant-old': '#474747',
        'outline-variant':    '#C6C6C6',
        'zebi-success':       '#15803D',
        'zebi-red':           '#DD3A44',
        'bg-cream':           '#F9F9F9',
        'bg-paper':           '#FFFFFF',
        'text-asphalt':       '#1A1C1C',
        'candy-apple':        '#DD3A44',
      },
      spacing: {
        gutter: '32px',
        // Design system spacing scale
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        DEFAULT: '4px',  // Monolith: restrained, no "playful" rounding
        card:    '4px',  // cards — sharp
        input:   '4px',  // inputs / buttons
        pill:    '9999px',
        sm:      '4px',
        md:      '6px',
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
        // Monolith: ambient only — the shadow should be felt, not seen
        'card':       '0px 20px 40px rgba(0,0,0,0.04)',
        'card-hover': '0px 20px 40px rgba(0,0,0,0.07)',
        'float':      '0px 20px 40px rgba(0,0,0,0.04)',
        'subtle':     '0px 4px 12px rgba(0,0,0,0.03)',
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
