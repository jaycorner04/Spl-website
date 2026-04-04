/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Bebas Neue", "sans-serif"],
        body: ["Barlow", "sans-serif"],
        condensed: ["Barlow Condensed", "sans-serif"],
      },
    },
  },
  plugins: [],
};