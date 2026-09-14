/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2fb',
          100: '#fbe6f7',
          200: '#f6c8ec',
          300: '#eea0dc',
          400: '#e06cc4',
          500: '#cf45ab',
          600: '#b32c8b',
          700: '#8f2170',
          800: '#761c5c',
          900: '#631a4e',
        },
        ink: {
          900: '#1c1230',
        },
      },
      fontFamily: {
        sans: ['"Hiragino Sans"', '"Noto Sans JP"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
