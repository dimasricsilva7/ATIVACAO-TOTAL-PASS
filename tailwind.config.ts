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
        // Paleta TotalPass: verde vibrante/mint sobre verde muito escuro.
        brand: {
          50: "#e8fef2",
          100: "#c6fce0",
          200: "#8ef8c2",
          300: "#4fef9f",
          400: "#22e181",
          500: "#10c96d",
          600: "#07a95a",
          700: "#09854a",
          800: "#0c683c",
          900: "#0a5533",
        },
        night: {
          950: "#03120b",
          900: "#061a0f",
          800: "#0a2616",
          700: "#0f351f",
          600: "#164429",
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
        glow: "0 18px 50px -12px rgba(16, 201, 109, 0.5)",
        card: "0 10px 40px -12px rgba(3, 18, 11, 0.22)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #22e181 0%, #10c96d 55%, #07a95a 100%)",
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
