/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d0d0f',
          secondary: '#141416',
          tertiary: '#1a1a1e',
          card: '#1e1e24',
          hover: '#252530',
        },
        accent: {
          purple: '#7c3aed',
          'purple-light': '#a78bfa',
          'purple-dim': '#4c1d95',
          blue: '#3b82f6',
          'blue-light': '#93c5fd',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
        },
        text: {
          primary: '#f1f0f5',
          secondary: '#9d9aae',
          muted: '#5c5970',
          accent: '#a78bfa',
        },
        border: {
          DEFAULT: '#2a2a35',
          light: '#3a3a48',
          accent: '#7c3aed',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #7c3aed40' },
          '100%': { boxShadow: '0 0 20px #7c3aed80, 0 0 40px #7c3aed40' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
