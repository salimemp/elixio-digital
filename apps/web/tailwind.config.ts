import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gum: {
          pink: "#ff90e8",
          purple: "#7b61ff",
          yellow: "#f1e05a",
          cyan: "#23a6d5",
          black: "#111111",
          cream: "#fffdf5",
          mint: "#96f7d6",
          tangerine: "#ff9f43",
        },
      },
      fontFamily: {
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        gum: "0 6px 0 0 #111",
      },
    },
  },
  plugins: [],
};

export default config;
