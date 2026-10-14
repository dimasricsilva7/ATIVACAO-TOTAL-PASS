import type { Config } from "tailwindcss";

/**
 * Direção de arte inspirada em produtos premium de fitness/bem-estar (estilo TotalPass):
 * fundo escuro profundo (night) + magenta/rosa vibrante (brand) + acento violeta.
 * Não usa o logotipo oficial da TotalPass.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff0f7",
          100: "#ffe1ef",
          200: "#ffc3e0",
          300: "#ff94c6",
          400: "#ff579f",
          500: "#f21b7f",
          600: "#df0a6e",
          700: "#bb0a5c",
          800: "#9a0d4f",
          900: "#7f1044",
        },
        violet: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        night: {
          950: "#07061a",
          900: "#0c0a24",
          800: "#141134",
          700: "#1d1946",
          600: "#2a2560",
        },
        ink: {
          50: "#f6f6fb",
          100: "#eeedf6",
          200: "#dcd9ea",
          300: "#b9b4d0",
          400: "#8d87ab",
          500: "#655f85",
          600: "#4c4767",
          700: "#39354e",
          800: "#211e33",
          900: "#141126",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        quiz: "34rem",
      },
      boxShadow: {
        glow: "0 18px 50px -12px rgba(242, 27, 127, 0.45)",
        card: "0 10px 40px -12px rgba(12, 10, 36, 0.18)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #f21b7f 0%, #c4119b 50%, #7c3aed 100%)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(0.95)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        "pop": { "0%": { transform: "scale(0.8)", opacity: "0" }, "60%": { transform: "scale(1.08)" }, "100%": { transform: "scale(1)", opacity: "1" } },
        "shimmer": { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.35s ease-out both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "pop": "pop 0.4s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
