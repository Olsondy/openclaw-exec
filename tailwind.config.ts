import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Material Design 3 色彩 Token
        primary: {
          DEFAULT: '#6750A4',
          container: '#EADDFF',
          on: '#FFFFFF',
          'on-container': '#21005D',
        },
        secondary: {
          DEFAULT: '#625B71',
          container: '#E8DEF8',
          on: '#FFFFFF',
          'on-container': '#1D192B',
        },
        surface: {
          DEFAULT: '#FFFBFE',
          variant: '#E7E0EC',
          on: '#1C1B1F',
          'on-variant': '#49454F',
        },
        error: {
          DEFAULT: '#B3261E',
          container: '#F9DEDC',
          on: '#FFFFFF',
          'on-container': '#410E0B',
        },
        outline: '#79747E',
        background: '#FFFBFE',
      },
      borderRadius: {
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      fontFamily: {
        sans: ['Inter', 'Google Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'elevation-1': '0 1px 2px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
        'elevation-2': '0 2px 6px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
