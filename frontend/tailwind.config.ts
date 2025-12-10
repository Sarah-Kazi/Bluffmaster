import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        felt: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        poker: {
          green: '#0d5c2f',
          'green-dark': '#0a4021',
          'green-darker': '#072818',
          burgundy: '#7c2d3a',
          'burgundy-dark': '#5a1f2a',
          gold: '#d4af37',
          'gold-dark': '#b8941f',
          wood: '#3d2817',
          'wood-light': '#5c3d28',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'shine': 'shine 2s ease-in-out infinite',
        'card-deal': 'card-deal 0.5s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: '0.3' },
          '50%': { transform: 'translateY(-20px) rotate(5deg)', opacity: '0.6' },
        },
        shine: {
          '0%, 100%': { backgroundPosition: '200% center' },
          '50%': { backgroundPosition: '-200% center' },
        },
        'card-deal': {
          '0%': { transform: 'translateX(-100px) rotate(-15deg)', opacity: '0' },
          '100%': { transform: 'translateX(0) rotate(0deg)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(212, 175, 55, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.6), 0 0 30px rgba(212, 175, 55, 0.3)' },
        },
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
