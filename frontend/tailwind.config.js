/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-bg-base) / <alpha-value>)',
        surface: 'rgb(var(--color-bg-surface) / <alpha-value>)',
        input: 'rgb(var(--color-bg-input) / <alpha-value>)',
        foreground: 'rgb(var(--color-text-main) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border-main) / <alpha-value>)',
        brand: '#ffa116',
        space: {
          900: '#0B0C10',
          800: '#0d0f14',
          700: '#111318',
          600: '#1a1d24',
          500: '#232630',
        },
        cyan: {
          400: '#45A29E',
          500: '#3d918d',
          300: '#66c2bd',
          glow: '#45A29E',
        },
        neon: '#45A29E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          from: { boxShadow: '0 0 5px #45A29E, 0 0 10px #45A29E' },
          to: { boxShadow: '0 0 15px #45A29E, 0 0 30px #45A29E, 0 0 45px #45A29E' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
