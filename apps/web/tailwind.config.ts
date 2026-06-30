import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // enable `dark:` variants via the .dark class on <html>
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette tokens — driven by CSS variables set in
        // <html style="..."> by the ThemeProvider. Switching brand
        // swaps the gum-* colors site-wide without a rebuild.
        gum: {
          pink: "var(--gum-pink)",
          purple: "var(--gum-purple)",
          yellow: "var(--gum-yellow)",
          cyan: "var(--gum-cyan)",
          black: "var(--gum-black)",
          cream: "var(--gum-cream)",
          mint: "var(--gum-mint)",
          tangerine: "var(--gum-tangerine)",
        },
        // Semantic surface tokens for light/dark mode. These use
        // Tailwind's dark: variant to flip when .dark is set on <html>.
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f5f5f4",
          subtle: "#fafaf9",
          // Dark variants
          "dark-DEFAULT": "#0a0a0a",
          "dark-muted": "#171717",
          "dark-subtle": "#0f0f0f",
        },
        ink: {
          DEFAULT: "#111111",
          muted: "#525252",
          subtle: "#737373",
          // Dark variants
          "dark-DEFAULT": "#fafafa",
          "dark-muted": "#d4d4d4",
          "dark-subtle": "#a3a3a3",
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
        "gum-dark": "0 6px 0 0 #000",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};

export default config;