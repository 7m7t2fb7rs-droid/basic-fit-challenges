/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bf: {
          orange: "#C4470F", // assez foncé pour du texte blanc (contraste 4,9:1)
          dark: "#A63C0C", // lisible en texte sur fond clair
          light: "#FFF3E9",
        },
      },
    },
  },
  plugins: [],
};
