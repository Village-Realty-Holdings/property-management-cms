import { DM_Sans, Inter, Lora, Playfair_Display } from 'next/font/google'

import type { FontKey } from '@/lib/themeCss'

/**
 * Optional font presets a tenant can pick in the Theme global. Geist is the
 * default and is loaded by the layout itself. `preload: false` keeps the
 * unused presets out of every page's preload hints; the @font-face rules
 * are cheap and only fetched when a tenant's theme references them.
 */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', preload: false })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', preload: false })
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', preload: false })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', preload: false })

const FONT_CLASSES: Record<Exclude<FontKey, 'geist'>, string> = {
  inter: inter.variable,
  'dm-sans': dmSans.variable,
  lora: lora.variable,
  playfair: playfair.variable,
}

/** `<html>` class names that define the CSS variables for the given presets. */
export const fontClassNames = (keys: FontKey[]): string[] =>
  keys.filter((k): k is Exclude<FontKey, 'geist'> => k !== 'geist').map((k) => FONT_CLASSES[k])
