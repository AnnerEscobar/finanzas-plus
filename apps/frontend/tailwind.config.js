/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#1f4e79',
          600: '#1a3f5a',
          900: '#0a1929',
        },
      },
    },
  },
  plugins: [],
}
