/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0C0C10",
          1: "#131318",
          2: "#1A1A22",
          3: "#24242E",
          4: "#32323F",
        },
        cream: {
          DEFAULT: "#EAE4D8",
          dim: "#A09896",
          faint: "#504D58",
        },
        amber: {
          DEFAULT: "#C8924A",
          bright: "#E0A85A",
          dim: "#7A5228",
          glow: "rgba(200,146,74,0.15)",
        },
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        serif: ["Lora", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
        "cursor-blink": "cursorBlink 1.1s step-end infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        cursorBlink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
