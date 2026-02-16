/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/views/**/*.html', './public/js/**/*.js'],
  darkMode: 'selector',
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'],
    darkTheme: 'dark',
  },
};
