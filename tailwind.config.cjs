/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: 'rgba(10, 20, 30, 0.68)'
      },
      boxShadow: {
        glow: '0 10px 35px rgba(34, 211, 238, 0.18)'
      }
    }
  },
  plugins: []
};
