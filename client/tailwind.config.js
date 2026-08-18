/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        ink: {
          800: '#0e1626',
          900: '#0b1220',
          950: '#060a14',
        },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(28px, -36px) scale(1.06)' },
          '66%': { transform: 'translate(-20px, 28px) scale(0.96)' },
        },
        aurora: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)', opacity: '0.65' },
          '50%': { transform: 'translate(-48px, 48px) rotate(14deg)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.7)', opacity: '0.55' },
          '80%, 100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.9' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 16s ease-in-out infinite',
        aurora: 'aurora 16s ease-in-out infinite',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 6s ease infinite',
        marquee: 'marquee 36s linear infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
        twinkle: 'twinkle 3.6s ease-in-out infinite',
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(16, 185, 129, 0.45)',
        'glow-lg': '0 0 80px -12px rgba(16, 185, 129, 0.5)',
        card: '0 1px 2px rgba(6, 10, 20, 0.04), 0 12px 32px -12px rgba(6, 10, 20, 0.12)',
        'card-hover': '0 2px 4px rgba(6, 10, 20, 0.05), 0 24px 56px -20px rgba(6, 10, 20, 0.22)',
      },
    },
  },
  plugins: [],
};
