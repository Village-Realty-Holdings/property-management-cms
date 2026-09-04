/**
 * Turns a tenant's Theme document into CSS custom properties that override
 * the defaults in `src/app/shadcn-theme.css`. Pure, so it can be unit
 * tested without Payload; kept free of `@/payload-types` on purpose so the
 * collection config can import the option lists without a type cycle.
 */

export const FONT_OPTIONS = [
  { label: 'Geist (default)', value: 'geist' },
  { label: 'Inter', value: 'inter' },
  { label: 'DM Sans', value: 'dm-sans' },
  { label: 'Lora (serif)', value: 'lora' },
  { label: 'Playfair Display (serif)', value: 'playfair' },
] as const

export type FontKey = (typeof FONT_OPTIONS)[number]['value']

/** CSS variable each font preset exposes; see `src/Theme/fonts.ts` for the loaders. */
export const FONT_VARIABLES: Record<FontKey, string> = {
  geist: '--font-geist-sans',
  inter: '--font-inter',
  'dm-sans': '--font-dm-sans',
  lora: '--font-lora',
  playfair: '--font-playfair',
}

export const RADIUS_OPTIONS = [
  { label: 'Square', value: 'none' },
  { label: 'Slight', value: 'sm' },
  { label: 'Rounded (default)', value: 'md' },
  { label: 'Soft', value: 'lg' },
  { label: 'Pill', value: 'xl' },
] as const

export type RadiusKey = (typeof RADIUS_OPTIONS)[number]['value']

const RADIUS_VALUES: Record<RadiusKey, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.625rem',
  lg: '1rem',
  xl: '1.5rem',
}

/** Theme colour slot → CSS variable name. Order is the order they are emitted. */
const COLOR_SLOTS = {
  background: '--background',
  foreground: '--foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  border: '--border',
  muted: '--muted',
} as const

type ColorSlot = keyof typeof COLOR_SLOTS

export type ThemePalette = Partial<Record<ColorSlot, string | null>>

export type ThemeInput = {
  light?: ThemePalette | null
  typography?: { bodyFont?: string | null; headingFont?: string | null } | null
  shape?: { radius?: string | null } | null
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

const isFont = (v: unknown): v is FontKey => typeof v === 'string' && v in FONT_VARIABLES
const isRadius = (v: unknown): v is RadiusKey => typeof v === 'string' && v in RADIUS_VALUES

const paletteDeclarations = (palette: ThemePalette | null | undefined): string[] => {
  if (!palette) return []
  const out: string[] = []
  for (const slot of Object.keys(COLOR_SLOTS) as ColorSlot[]) {
    const value = palette[slot]
    // Only ever emit validated hex, so a stray value can never break out of the style block.
    if (typeof value === 'string' && HEX.test(value)) out.push(`${COLOR_SLOTS[slot]}:${value.toLowerCase()}`)
  }
  return out
}

/** Font presets the theme actually uses, so the layout can load only those. */
export const themeFonts = (theme: ThemeInput | null | undefined): FontKey[] => {
  const keys = new Set<FontKey>()
  const body = theme?.typography?.bodyFont
  const heading = theme?.typography?.headingFont
  if (isFont(body) && body !== 'geist') keys.add(body)
  if (isFont(heading) && heading !== 'geist') keys.add(heading)
  return [...keys]
}

/**
 * CSS overriding the default tokens. The selector uses `html:root` so it
 * beats the `:root` rule in the stylesheet regardless of load order. Empty string when the theme
 * changes nothing.
 */
export const themeToCss = (theme: ThemeInput | null | undefined): string => {
  if (!theme) return ''

  const root = paletteDeclarations(theme.light)

  const body = theme.typography?.bodyFont
  if (isFont(body) && body !== 'geist') root.push(`--font-sans:var(${FONT_VARIABLES[body]})`)

  const heading = theme.typography?.headingFont
  if (isFont(heading)) {
    // Only needed when it differs from the body font, which `--font-heading` already follows.
    if (heading !== (isFont(body) ? body : 'geist')) root.push(`--font-heading:var(${FONT_VARIABLES[heading]})`)
  }

  const radius = theme.shape?.radius
  if (isRadius(radius) && radius !== 'md') root.push(`--radius:${RADIUS_VALUES[radius]}`)

  const blocks: string[] = []
  if (root.length) blocks.push(`html:root{${root.join(';')}}`)
  return blocks.join('\n')
}
