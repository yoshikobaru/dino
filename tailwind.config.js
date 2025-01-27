/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./game/*.{html,js}",     // Для файлов в папке game
    "./game/**/*.{html,js}",  // Для файлов в подпапках game
    "./*.{html,js}"           // Для файлов в корневой директории
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
