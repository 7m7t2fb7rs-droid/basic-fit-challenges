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
          orange: "#F5761A",
          dark: "#D35400",
          light: "#FFF3E9",
        },
      },
    },
  },
  plugins: [],
};
