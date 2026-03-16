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
        sans: ['system-ui', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        'candy-apple': '#e82535',
        'crimson': '#c92870',
        'cool-blue': '#074f67',
        'deep-lake': '#143548',
        'gravel': '#5e5656',
        'wet-cement': '#77848e',
        'cloudy': '#f0f0f3',
        'bg-cream': '#f0f0f3',
        'bg-paper': '#FFFFFF',
        'text-asphalt': '#143548',
      },
      spacing: {
        gutter: '32px',
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        'card-hover': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    heroui({
      layout: {
        radius: {
          small: '8px',    // Small elements (chips, badges)
          medium: '12px',  // Most UI elements (cards, inputs)
          large: '16px',   // Large containers
        },
      },
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: '#e82535',
              foreground: '#FFFFFF',
              50: '#fef2f3',
              100: '#fee5e8',
              200: '#fccfd5',
              300: '#f9a3ad',
              400: '#f57a8a',
              500: '#e82535',
              600: '#c92870',
              700: '#a82835',
              800: '#8b2230',
              900: '#77202c',
            },
            secondary: {
              DEFAULT: '#074f67',
              foreground: '#FFFFFF',
            },
            background: '#FFFFFF',
            foreground: '#143548',
            default: {
              50: '#f0f0f3',
              100: '#e6e6e9',
              200: '#d1d1d6',
              300: '#b0b0b8',
              400: '#77848e',
              500: '#5e5656',
              600: '#4a4747',
              700: '#393737',
              800: '#2a2828',
              900: '#1f1d1d',
            },
          },
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: '#e82535',
              foreground: '#FFFFFF',
              50: '#fef2f3',
              100: '#fee5e8',
              200: '#fccfd5',
              300: '#f9a3ad',
              400: '#f57a8a',
              500: '#e82535',
              600: '#c92870',
              700: '#a82835',
              800: '#8b2230',
              900: '#77202c',
            },
            secondary: {
              DEFAULT: '#074f67',
              foreground: '#FFFFFF',
            },
            background: '#143548',
            foreground: '#f0f0f3',
            default: {
              50: '#1f1d1d',
              100: '#2a2828',
              200: '#393737',
              300: '#4a4747',
              400: '#5e5656',
              500: '#77848e',
              600: '#b0b0b8',
              700: '#d1d1d6',
              800: '#e6e6e9',
              900: '#f0f0f3',
            },
          },
        },
      },
    }),
  ],
}
export default config
