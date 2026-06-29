/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // EXL brand orange (wordmark colour #fb4e0b).
        brand: {
          50: "#fff4ed",
          100: "#ffe6d5",
          200: "#feccaa",
          300: "#fda774",
          400: "#fb7a3c",
          500: "#fb4e0b",
          600: "#ec3f06",
          700: "#c43208",
          800: "#9c2b0e",
          900: "#7e270f",
        },
        // Deep ink / navy used for panels, headers and primary text.
        ink: {
          50: "#f4f5f7",
          100: "#e4e7ec",
          300: "#9aa4b2",
          500: "#4b5565",
          700: "#27303f",
          800: "#19212e",
          900: "#0f1620",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.08)",
        cardhover: "0 4px 12px rgba(16,24,40,0.10)",
        brand: "0 6px 20px rgba(251,78,11,0.30)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #fb4e0b 0%, #c43208 55%, #19212e 130%)",
        "ink-gradient": "linear-gradient(160deg, #19212e 0%, #0f1620 100%)",
      },
    },
  },
  plugins: [],
};
