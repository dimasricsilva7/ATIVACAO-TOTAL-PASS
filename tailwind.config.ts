import type { Config } from "tailwindcss";

/**
 * Paleta do quiz TotalPass (intermediação). Tons de azul-petróleo/teal + verde-energia,
 * transmitindo confiança e fitness sem usar as marcas oficiais da TotalPass.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf7",
          100: "#d1faec",
          200: "#a7f3d9",
          300: "#6ee7bf",
          400: "#34d3a1",
          500: "#12b886",
          600: "#0ca678",
          700: "#0b8a66",
          800: "#0d6e53",
          900: "#0e5a46",
        },
        ink: {
          50: "#f4f7f9",
          100: "#e6edf1",
          200: "#cbd9e1",
          300: "#9fb5c3",
          400: "#6c8599",
          500: "#4b6476",
          600: "#3a4f5e",
          700: "#2f404c",
          800: "#1f2b34",
          900: "#141d24",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        quiz: "34rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        "fade-in": "fade-in 0.3s ease-out both",
        "scale-in": "scale-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
