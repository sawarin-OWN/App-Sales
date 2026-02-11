/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun', 'sans-serif'],
      },
      colors: {
        keb: {
          blue: '#1a4781',
          'blue-light': '#234b75',
          'blue-dark': '#13325c',
        },
        yod: {
          green: '#4CAF50',
          'green-light': '#66BB6A',
          'green-pale': '#86efac',
        },
      },
    },
  },
  plugins: [],
}

