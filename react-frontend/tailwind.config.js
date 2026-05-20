/** @type {import('tailwindcss').Config} */
module.exports = {
   darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0f172a',
        darkCard: '#1e293b',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        success: '#10b981',
        danger: '#ef4444',
        textMain: '#f8fafc',
        textMuted: '#94a3b8'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}