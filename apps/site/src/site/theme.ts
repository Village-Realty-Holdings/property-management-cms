import type { Media, SiteSetting } from "../payload-types"

/**
 * The Site's branding (Site Settings), resolved into what the layout
 * renders: colours, a font pairing, logo and contact details. Missing
 * colours fall back to a default palette.
 */

export type FontPairing = "classic" | "modern" | "rustic"

export type Brand = {
  name: string
  tagline: string | null
  logo: { url: string; alt: string } | null
  primary: string
  accent: string
  fontPairing: FontPairing
  phone: string | null
  email: string | null
  address: string | null
  social: { platform: string; url: string }[]
}

const DEFAULT_PRIMARY = "#283d6b"
const DEFAULT_ACCENT = "#f2a65a"
const DEFAULT_NAME = "Awayday"

const pairings: FontPairing[] = ["classic", "modern", "rustic"]

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

/** A Media upload's URL and alt text, or null when it isn't populated. */
export function imageOf(
  value: number | Media | null | undefined
): { url: string; alt: string } | null {
  if (!value || typeof value !== "object" || !value.url) return null
  return { url: value.url, alt: value.alt ?? "" }
}

export function resolveBrand(settings: SiteSetting | null): Brand {
  const branding = settings?.branding
  const contact = settings?.contact
  const fontPairing = pairings.includes(branding?.fontPairing as FontPairing)
    ? (branding!.fontPairing as FontPairing)
    : "classic"
  return {
    name: text(settings?.name) ?? DEFAULT_NAME,
    tagline: text(settings?.tagline),
    logo: imageOf(branding?.logo),
    primary: normalizeHex(branding?.primaryColor) ?? DEFAULT_PRIMARY,
    accent: normalizeHex(branding?.accentColor) ?? DEFAULT_ACCENT,
    fontPairing,
    phone: text(contact?.phone),
    email: text(contact?.email),
    address: text(contact?.address),
    social: (settings?.social ?? []).filter((link) =>
      /^https?:\/\//.test(link.url)
    ),
  }
}

/** CSS custom properties for the Site's colours. */
export function brandColorVars(brand: Brand): Record<string, string> {
  const primaryText = readableOn(brand.primary)
  return {
    "--brand-primary": brand.primary,
    "--brand-primary-foreground": primaryText,
    "--brand-accent": brand.accent,
    "--brand-accent-foreground": readableOn(brand.accent),
    // shadcn tokens, tinted by the brand so the Site has its own paper.
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
