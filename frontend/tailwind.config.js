const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:   ['var(--font-geist-sans)', ...defaultTheme.fontFamily.sans],
        serif:  ['var(--font-instrument-serif)', ...defaultTheme.fontFamily.serif],
        syne:   ['var(--font-syne)', ...defaultTheme.fontFamily.sans],
        outfit: ['var(--font-outfit)', ...defaultTheme.fontFamily.sans],
        mono:   ['var(--font-jetbrains-mono)', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
      },
      typography: {
        DEFAULT: {
          css: {
            a: { color: '#1D4ED8', '&:hover': { color: '#3B82F6' } },
            'h1, h2, h3, h4': { color: '#111827' },
            blockquote: { borderLeftColor: '#3B82F6', color: '#4B5563' },
            strong: { color: '#111827' },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            code: {
              backgroundColor: '#F1F5F9',
              color: '#1D4ED8',
              padding: '0.15em 0.4em',
              borderRadius: '4px',
              fontWeight: '500',
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
