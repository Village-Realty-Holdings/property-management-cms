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

  it('overrides tokens with a higher-specificity selector', () => {
    const css = themeToCss({
      light: { primary: '#1D4ED8', primaryForeground: '#fff' },
    })
    expect(css).toBe(
      'html:root{--primary:#1d4ed8;--primary-foreground:#fff}',
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

  it('re-derives inverted surfaces from the tenant palette', () => {
    const css = themeToCss({
      light: { background: '#ffffff', foreground: '#101010', primary: '#0071ce', primaryForeground: '#ffffff' },
    })
    const [root, inverted] = css.split('\n')
    expect(root).toBe(
      'html:root{--background:#ffffff;--foreground:#101010;--primary:#0071ce;--primary-foreground:#ffffff}',
    )
    expect(inverted.startsWith("html:root [data-surface='inverted']{--background:#101010;--foreground:#ffffff;")).toBe(true)
    expect(inverted).toContain('--primary:#0071ce;--primary-foreground:#ffffff')
    expect(inverted).toContain('--accent:color-mix(in oklch,#101010,#0071ce 30%)')
  })

  it('skips the inverted block unless both background and foreground are set', () => {
    expect(themeToCss({ light: { background: '#ffffff', primary: '#0071ce' } })).toBe(
      'html:root{--background:#ffffff;--primary:#0071ce}',
    )
  })

  it('lists only the non-default fonts a theme needs', () => {
    expect(themeFonts(null)).toEqual([])
    expect(themeFonts({ typography: { bodyFont: 'geist', headingFont: 'geist' } })).toEqual([])
    expect(themeFonts({ typography: { bodyFont: 'lora', headingFont: 'lora' } })).toEqual(['lora'])
    expect(themeFonts({ typography: { bodyFont: 'inter', headingFont: 'playfair' } })).toEqual(['inter', 'playfair'])
  })
})
