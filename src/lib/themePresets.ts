import type { FontKey, RadiusKey, ThemePalette } from '@/lib/themeCss'

/**
 * Ready-made themes the admin can apply to a tenant's Theme document. Kept
 * free of `@/payload-types` so both the collection config and the client
 * picker component can import it.
 */
export type ThemePreset = {
  key: string
  label: string
  description: string
  light: ThemePalette
  typography: { bodyFont: FontKey; headingFont: FontKey }
  shape: { radius: RadiusKey }
}

/** Every colour slot, so applying a preset clears slots it does not set. */
export const PALETTE_SLOTS = [
  'background',
  'foreground',
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'accent',
  'accentForeground',
  'border',
  'muted',
] as const satisfies readonly (keyof ThemePalette)[]

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    key: 'coastal-teal',
    label: 'Coastal Teal',
    description: 'Teal accents with Inter body text and Playfair Display headings. Pill-shaped corners.',
    light: { primary: '#0f766e', primaryForeground: '#ffffff' },
    typography: { bodyFont: 'inter', headingFont: 'playfair' },
    shape: { radius: 'xl' },
  },
  {
    key: 'warren-beach-classic',
    label: 'Warren Beach Classic',
    description: 'The original warrenbeachrentals.com look: bright blue, sky-blue secondary, navy accents and Source Sans 3.',
    light: {
      background: '#ffffff',
      foreground: '#101010',
      primary: '#0071ce',
      primaryForeground: '#ffffff',
      secondary: '#009dd6',
      secondaryForeground: '#ffffff',
      accent: '#1d1645',
      accentForeground: '#ffffff',
      border: '#d5d8dc',
      muted: '#f1f3f5',
    },
    typography: { bodyFont: 'source-sans', headingFont: 'source-sans' },
    shape: { radius: 'sm' },
  },
]

export const PRESET_OPTIONS = THEME_PRESETS.map(({ key, label }) => ({ label, value: key }))

export const findPreset = (key: unknown): ThemePreset | undefined =>
  THEME_PRESETS.find((p) => p.key === key)
