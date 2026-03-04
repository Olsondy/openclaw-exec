import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Material Design 3 / Google Workspace / Anthropic 色彩 Token
        primary: {
          DEFAULT: '#0B57D0',
          container: '#D3E3FD',
          on: '#FFFFFF',
          'on-container': '#041E49',
        },
        secondary: {
          DEFAULT: '#5E5E5E',
          container: '#E3E3E3',
          on: '#FFFFFF',
          'on-container': '#1F1F1F',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          variant: '#F0F4F9',
          on: '#1F1F1F',
          'on-variant': '#444746',
        },
        error: {
          DEFAULT: '#B3261E',
          container: '#F9DEDC',
          on: '#FFFFFF',
          'on-container': '#410E0B',
        },
        outline: '#DADCE0',
        background: '#F8F9FA',
      },
      borderRadius: {
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px',
      },
      fontFamily: {
        sans: ['"Geist Sans"', 'Inter', 'Roboto', 'system-ui', 'sans-serif'],
        geist: ['"Geist Sans"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'elevation-1': '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
        'elevation-2': '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
      },
    },
  },
  plugins: [],
}

export default config
