/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        gold: {
          100: '#fdf3d0',
          200: '#fae5a0',
          300: '#f5d166',
          400: '#e8b94a',
          500: '#c99030',
          600: '#a07020',
          700: '#785010',
          800: '#503408',
          900: '#301e04',
        },
        felt: {
          950: '#05100d',
          900: '#081510',
          800: '#0e2018',
          700: '#163020',
          600: '#1e4030',
        },
      },
      boxShadow: {
        'gold-sm': '0 1px 3px rgba(201, 144, 48, 0.3)',
        'gold': '0 4px 16px rgba(201, 144, 48, 0.25), 0 1px 4px rgba(201, 144, 48, 0.15)',
        'gold-lg': '0 8px 32px rgba(201, 144, 48, 0.3), 0 2px 8px rgba(201, 144, 48, 0.2)',
        'card': '0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
        'card-lg': '0 4px 24px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
