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
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          foreground: "var(--color-on-primary)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          variant: "var(--color-surface-variant)",
        },
      },
      fontFamily: {
        sans: ["var(--font-roboto)", "Roboto", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow-sm)",
        "card-hover": "var(--shadow-md)",
      },
    },
  },
  plugins: [],
};
export default config;
