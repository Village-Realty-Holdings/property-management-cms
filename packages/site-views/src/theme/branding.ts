import type { Image, SiteSettings } from "@workspace/content/queries"

/**
 * A Site's branding (CMS `site.branding.*`), resolved into what the layout
 * renders: colours, a font pairing, logo and contact details. Missing values
 * fall back to a palette and pairing derived from the Site's slug, so every
 * Site looks like itself even before an Admin sets its branding.
 */

export type FontPairing = "classic" | "modern" | "rustic"

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "x"
  | "youtube"
  | "tiktok"

export type SocialLink = { platform: SocialPlatform; url: string }

/** `SiteSettings.branding` as the content adapters return it. */
export type SiteBranding = {
  logo: Image | null
  primaryColor?: string | null
  accentColor?: string | null
  fontPairing?: FontPairing | null
  tagline?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  social: SocialLink[]
}

export type Brand = {
  name: string
  tagline: string | null
  logo: Image | null
  primary: string
  accent: string
  fontPairing: FontPairing
  phone: string | null
  email: string | null
  address: string | null
  social: SocialLink[]
}

type Palette = { primary: string; accent: string }

/** Fallback palettes: deep, legible primaries with a warm or bright accent. */
const palettes: Palette[] = [
  { primary: "#283d6b", accent: "#f2a65a" }, // lake navy and sunset
  { primary: "#1d4638", accent: "#e0a93b" }, // pine and ochre
  { primary: "#4b5a33", accent: "#d8b572" }, // sage and straw
  { primary: "#4a2f55", accent: "#f0b98a" }, // dusk plum and peach
  { primary: "#6b3a26", accent: "#e9c46a" }, // canyon and sun
  { primary: "#0d4a5e", accent: "#8fd3c4" }, // deep tide and sea glass
]

const pairings: FontPairing[] = ["classic", "modern", "rustic"]

/** FNV-1a: a small, stable string hash. */
function hash(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** A valid `#rgb`/`#rrggbb` as lower-case `#rrggbb`, else null. */
export function normalizeHex(value: string | null | undefined): string | null {
  const hex = value?.trim()
  if (!hex || !HEX.test(hex)) return null
  const digits = hex.slice(1).toLowerCase()
  return `#${
    digits.length === 3 ? [...digits].map((d) => d + d).join("") : digits
  }`
}

/** WCAG relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

const LIGHT_TEXT = "#ffffff"
const DARK_TEXT = "#1b1c1e"

/** White or near-black, whichever reads better on `hex`. */
export function readableOn(hex: string): string {
  const l = luminance(hex)
  return contrast(l, luminance(LIGHT_TEXT)) >= contrast(l, luminance(DARK_TEXT))
    ? LIGHT_TEXT
    : DARK_TEXT
}

const text = (value: string | null | undefined) => value?.trim() || null

/** Branding from Site Settings, when the adapter provides it. */
function brandingOf(settings: SiteSettings): Partial<SiteBranding> {
  return (
    (settings as SiteSettings & { branding?: Partial<SiteBranding> })
      .branding ?? {}
  )
}

export function resolveBrand(settings: SiteSettings): Brand {
  const branding = brandingOf(settings)
  const seed = hash(settings.slug)
  const palette = palettes[(seed >>> 16) % palettes.length]!
  const fontPairing =
    branding.fontPairing && pairings.includes(branding.fontPairing)
      ? branding.fontPairing
      : pairings[(seed >>> 8) % pairings.length]!
  return {
    name: settings.name,
    tagline: text(branding.tagline),
    logo: branding.logo?.url ? branding.logo : null,
    primary: normalizeHex(branding.primaryColor) ?? palette.primary,
    accent: normalizeHex(branding.accentColor) ?? palette.accent,
    fontPairing,
    phone: text(branding.phone) ?? text(settings.contact.phone),
    email: text(branding.email) ?? text(settings.contact.email),
    address: text(branding.address),
    social: (branding.social ?? []).filter(
      (link) => typeof link?.url === "string" && /^https?:\/\//.test(link.url)
    ),
  }
}

/** CSS custom properties for the Site's colours, set on `<html>`. */
export function brandColorVars(brand: Brand): Record<string, string> {
  const primaryText = readableOn(brand.primary)
  return {
    "--brand-primary": brand.primary,
    "--brand-primary-foreground": primaryText,
    "--brand-accent": brand.accent,
    "--brand-accent-foreground": readableOn(brand.accent),
    // shadcn tokens, tinted by the brand so each Site has its own paper.
    "--primary": brand.primary,
    "--primary-foreground": primaryText,
    "--ring": brand.primary,
    "--background": `color-mix(in oklab, ${brand.primary} 3%, white)`,
    "--foreground": `color-mix(in oklab, ${brand.primary} 22%, #151515)`,
    "--card": "#ffffff",
    "--card-foreground": `color-mix(in oklab, ${brand.primary} 22%, #151515)`,
    "--muted": `color-mix(in oklab, ${brand.primary} 7%, white)`,
    "--muted-foreground": `color-mix(in oklab, ${brand.primary} 35%, #5b5b5b)`,
    "--secondary": `color-mix(in oklab, ${brand.primary} 9%, white)`,
    "--secondary-foreground": brand.primary,
    "--border": `color-mix(in oklab, ${brand.primary} 15%, white)`,
    "--input": `color-mix(in oklab, ${brand.primary} 18%, white)`,
  }
}

/** `tel:` href from a displayed phone number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`
}
