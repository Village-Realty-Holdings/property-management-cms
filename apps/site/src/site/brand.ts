import type { Brand as BrandGlobal, Media } from "../payload-types"

/**
 * The Site's identity (the Brand global), resolved into what the layout
 * renders: name, logo, contact details and social links. A Brand nobody has
 * saved yet still renders, under a default name.
 */

export type Brand = {
  name: string
  tagline: string | null
  logo: Image | null
  /** The logo for a Primary or Dark band, when the Brand has one. */
  logoLight?: Image | null
  phone: string | null
  email: string | null
  address: string | null
  social: { platform: string; url: string }[]
}

export type Image = { url: string; alt: string }

const DEFAULT_NAME = "Awayday"

const text = (value: string | null | undefined) => value?.trim() || null

/** A Media upload's URL and alt text, or null when it isn't populated. */
export function imageOf(
  value: number | Media | null | undefined
): Image | null {
  if (!value || typeof value !== "object" || !value.url) return null
  return { url: value.url, alt: value.alt ?? "" }
}

export function resolveBrand(brand: BrandGlobal | null): Brand {
  const contact = brand?.contact
  return {
    name: text(brand?.name) ?? DEFAULT_NAME,
    tagline: text(brand?.tagline),
    logo: imageOf(brand?.logo),
    logoLight: imageOf(brand?.logoLight),
    phone: text(contact?.phone),
    email: text(contact?.email),
    address: text(contact?.address),
    social: (brand?.social ?? []).filter((link) =>
      /^https?:\/\//.test(link.url)
    ),
  }
}
