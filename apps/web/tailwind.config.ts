import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        void: "#0A0A0F",
        cream: "#F8F7F4",
        primary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8B5CF6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        accent: {
          pink: "#EC4899",
          cyan: "#06B6D4",
          lime: "#84CC16",
          yellow: "#FACC15",
        },
        surface: {
          lavender: "#E9D5FF",
          mint: "#D1FAE5",
          peach: "#FED7AA",
        },
        glass: "rgba(255, 255, 255, 0.05)",
        "glass-border": "rgba(255, 255, 255, 0.10)",
      },
      fontFamily: {
        heading: ['"Space Grotesk"', "Poppins", "system-ui", "sans-serif"],
        body: ['"Inter"', "SF Pro Text", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        sans: ['"Inter"', "SF Pro Text", "system-ui", "sans-serif"],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "1.75rem",
        "5xl": "2rem",
      },
      boxShadow: {
        glow: "0 8px 32px rgba(139, 92, 246, 0.15)",
        "glow-lg": "0 12px 48px rgba(139, 92, 246, 0.22)",
        "glow-pink": "0 8px 32px rgba(236, 72, 153, 0.15)",
        "glow-lime": "0 8px 32px rgba(132, 204, 22, 0.18)",
        "glow-yellow": "0 8px 32px rgba(250, 204, 21, 0.18)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.12)",
      },
      animation: {
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.2s ease-out",
        shimmer: "shimmer 1.5s infinite linear",
        mesh: "mesh 12s ease infinite",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(24px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        mesh: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(139, 92, 246, 0.4)" },
          "50%": { boxShadow: "0 0 0 16px rgba(139, 92, 246, 0)" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [
    function ({ addUtilities }: { addUtilities: Function }) {
      addUtilities({
        ".tap-48": {
          minWidth: "48px",
          minHeight: "48px",
        },
        ".text-balance": {
          textWrap: "balance",
        },
      });
    },
  ],
} satisfies Config;
