module.exports = {
  mode: "jit",
  content: [
    "./components/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        raleway: ['"Raleway"', "sans-serif"],
        arima: ["Arima Madurai", "cursive"],
        anonymous: ["Anonymous Pro", "monospace"],
        cinzel: ["Cinzel", "serif"],
      },
    },
  },
  variants: {
    extend: {
      fontWeight: ["hover", "focus"],
      borderRadius: ["hover", "focus"],
    },
  },
  plugins: [],
};
