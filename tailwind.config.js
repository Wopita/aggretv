/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#dc2626', // Rojo AGGRETV
          black: '#000000',
          zinc: '#09090b'
        }
      }
    },
  },
  plugins: [],
}