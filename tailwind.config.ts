import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: {
            DEFAULT: '#3BB4D8',
            light: '#48C4E7',
            dark: '#2A91B0',
            glow: 'rgba(59, 180, 216, 0.25)',
          },
          orange: {
            DEFAULT: '#E87A38',
            light: '#F28C38',
            dark: '#C85C20',
            glow: 'rgba(232, 122, 56, 0.25)',
          },
          green: {
            DEFAULT: '#4DAA78',
            light: '#62C28E',
            dark: '#3A8E60',
          },
          dark: {
            DEFAULT: '#0F1215',
            surface: '#161B22',
            card: '#1F2630',
            hover: '#2A3340',
            border: '#2D3745',
          },
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        heading: ['var(--font-outfit)', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'layer-scan': 'layerScan 3s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 12px rgba(59,180,216,0.6))' },
          '50%': { opacity: '0.7', filter: 'drop-shadow(0 0 4px rgba(59,180,216,0.2))' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        layerScan: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
      },
      boxShadow: {
        'cyan-glow': '0 0 20px -3px rgba(59, 180, 216, 0.3)',
        'orange-glow': '0 0 20px -3px rgba(232, 122, 56, 0.3)',
        'card-3d': '0 10px 30px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
