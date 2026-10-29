/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        os: {
          dark: '#0a0d14',
          panel: '#0f172a',
          card: '#141e33',
          border: '#1e293b',
          borderGlow: '#334155',
          accent: '#0ea5e9',
          accentHover: '#38bdf8',
          running: '#10b981',
          ready: '#38bdf8',
          waiting: '#f59e0b',
          terminated: '#64748b',
          zombie: '#ec4899',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
