import { describe, expect, it } from 'vitest'

import { themeFonts, themeToCss } from '@/lib/themeCss'

describe('themeToCss', () => {
  it('emits nothing for an empty or default theme', () => {
    expect(themeToCss(null)).toBe('')
    expect(themeToCss({})).toBe('')
    expect(
      themeToCss({ typography: { bodyFont: 'geist', headingFont: 'geist' }, shape: { radius: 'md' } }),
    ).toBe('')
  })

  it('overrides light and dark tokens with higher-specificity selectors', () => {
    const css = themeToCss({
      light: { primary: '#1D4ED8', primaryForeground: '#fff' },
      dark: { primary: '#93c5fd' },
    })
    expect(css).toBe(
      "html:root{--primary:#1d4ed8;--primary-foreground:#fff}\nhtml[data-theme='dark']{--primary:#93c5fd}",
    )
  })

  it('drops values that are not hex colours', () => {
    const css = themeToCss({ light: { primary: 'red; } body { display: none', background: '#ffffff' } })
    expect(css).toBe('html:root{--background:#ffffff}')
  })

  it('maps fonts and radius, skipping a heading font equal to the body font', () => {
    expect(themeToCss({ typography: { bodyFont: 'lora', headingFont: 'lora' } })).toBe(
      'html:root{--font-sans:var(--font-lora)}',
    )
    expect(themeToCss({ typography: { bodyFont: 'inter', headingFont: 'playfair' }, shape: { radius: 'xl' } })).toBe(
      'html:root{--font-sans:var(--font-inter);--font-heading:var(--font-playfair);--radius:1.5rem}',
    )
    expect(themeToCss({ typography: { headingFont: 'playfair' } })).toBe(
      'html:root{--font-heading:var(--font-playfair)}',
    )
    expect(themeToCss({ shape: { radius: 'bogus' } })).toBe('')
  })

  it('lists only the non-default fonts a theme needs', () => {
    expect(themeFonts(null)).toEqual([])
    expect(themeFonts({ typography: { bodyFont: 'geist', headingFont: 'geist' } })).toEqual([])
    expect(themeFonts({ typography: { bodyFont: 'lora', headingFont: 'lora' } })).toEqual(['lora'])
    expect(themeFonts({ typography: { bodyFont: 'inter', headingFont: 'playfair' } })).toEqual(['inter', 'playfair'])
  })
})
