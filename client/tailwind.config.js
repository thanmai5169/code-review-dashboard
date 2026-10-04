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
        bg: {
          0: 'var(--bg-0)',
          1: 'var(--bg-1)',
          2: 'var(--bg-2)',
        },
        border: 'var(--border)',
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        text: {
          1: 'var(--text-1)',
          2: 'var(--text-2)',
        }
      },
      fontFamily: {
        display: ['"JetBrains Mono"', 'monospace'],
        body: ['Inter', 'sans-serif'],
        code: ['"Fira Code"', 'monospace'],
      },
      animation: {
        'scan': 'scan-line 2.5s ease-in-out infinite',
      },
      keyframes: {
        'scan-line': {
          '0%': { top: '0%', opacity: 0 },
          '10%': { opacity: 0.8 },
          '90%': { opacity: 0.8 },
          '100%': { top: '100%', opacity: 0 }
        }
      }
    },
  },
  plugins: [],
}
