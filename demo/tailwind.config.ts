import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        page: '#eae5df',
        surface: '#f5f2ee',
        'surface-alt': '#e0dbd4',
        'border-subtle': '#b5afa7',
        'border-strong': '#3d3d3d',
        'text-primary': '#1a1a1a',
        'text-body': '#3d3d3d',
        'text-muted': '#7a756f',
      },
    },
  },
  plugins: [],
} satisfies Config;
