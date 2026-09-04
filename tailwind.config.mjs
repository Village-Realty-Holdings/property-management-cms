/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--color-foreground)',
            '--tw-prose-headings': 'var(--color-foreground)',
            '--tw-prose-links': 'var(--color-primary)',
            '--tw-prose-bold': 'var(--color-foreground)',
            '--tw-prose-quotes': 'var(--color-foreground)',
            maxWidth: '65ch',
            h1: { fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.05 },
            h2: { fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.15 },
            h3: { fontWeight: 600, lineHeight: 1.25 },
            a: { fontWeight: 500, textUnderlineOffset: '3px' },
          },
        },
      },
    },
  },
}

export default config
