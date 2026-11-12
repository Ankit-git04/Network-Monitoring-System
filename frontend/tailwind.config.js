/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0a0f1e',
          800: '#0d1526',
          700: '#111c35',
          600: '#1a2744',
          500: '#1e3a5f',
        }
      }
    },
  },
  plugins: [],
}
