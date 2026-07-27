/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F4F6F9",
        panel: "#FFFFFF",
        navy: "#0B2A4A",
        navySoft: "#123A63",
        line: "#E1E6ED",
        text: "#152238",
        muted: "#64748B",
        good: "#1E8A5F",
        bad: "#C0392B",
      },
      fontFamily: {
        display: ["'Oswald'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
