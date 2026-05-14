/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dce6ff',
          500: '#3b6ef8',
          600: '#2c5be8',
          700: '#1e47d4',
          900: '#0f2878',
        }
      },
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
      }
    }
  },
  plugins: []
}
