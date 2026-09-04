import { describe, expect, it } from 'vitest'

import { FONT_VARIABLES, RADIUS_OPTIONS, themeToCss } from '@/lib/themeCss'
import { findPreset, THEME_PRESETS } from '@/lib/themePresets'

describe('THEME_PRESETS', () => {
  it('only reference fonts and radii the theme renderer understands', () => {
    const radii = RADIUS_OPTIONS.map((o) => o.value as string)
    for (const preset of THEME_PRESETS) {
      expect(FONT_VARIABLES).toHaveProperty(preset.typography.bodyFont)
      expect(FONT_VARIABLES).toHaveProperty(preset.typography.headingFont)
      expect(radii).toContain(preset.shape.radius)
    }
  })

  it('produce CSS with every colour they declare', () => {
    for (const preset of THEME_PRESETS) {
      const css = themeToCss(preset)
      for (const value of Object.values(preset.light)) expect(css).toContain(String(value).toLowerCase())
    }
  })

  it('finds presets by key and nothing otherwise', () => {
    expect(findPreset('warren-beach-classic')?.light.primary).toBe('#0071ce')
    expect(findPreset('nope')).toBeUndefined()
    expect(findPreset(undefined)).toBeUndefined()
  })
})
