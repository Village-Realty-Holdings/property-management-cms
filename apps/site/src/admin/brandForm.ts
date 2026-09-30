import type { Brand } from "../payload-types"
import { mediaId } from "./pageForm"

/**
 * The Brand as the Admin's form edits it, and the checks the form's Server
 * Action runs on what it receives. Plain data, so it crosses the
 * server/client boundary as is.
 */

export const SOCIAL_PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["value"]

export type SocialLinkValues = { platform: string; url: string }

export type BrandValues = {
  name: string
  tagline: string
  logo: number | null
  phone: string
  email: string
  address: string
  social: SocialLinkValues[]
}

export const emptyBrand: BrandValues = {
  name: "",
  tagline: "",
  logo: null,
  phone: "",
  email: "",
  address: "",
  social: [],
}

export type BrandParseResult =
  | { ok: true; values: BrandValues }
  | { ok: false; fieldErrors: Record<string, string>; message?: string }

const URL_ERROR = "Enter an http(s) URL, like https://example.com."

export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "")

/**
 * Validates a submitted Brand (untrusted: it arrives from the browser) and
 * returns it cleaned, or the errors keyed by Payload field path
 * ("contact.email", "social.1.url").
 */
export function parseBrandValues(input: unknown): BrandParseResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      fieldErrors: {},
      message: "The form could not be read. Reload the page and try again.",
    }
  }

  const fieldErrors: Record<string, string> = {}
  const values: BrandValues = {
    name: text(input.name),
    tagline: text(input.tagline),
    logo:
      typeof input.logo === "number" && Number.isInteger(input.logo)
        ? input.logo
        : null,
    phone: text(input.phone),
    email: text(input.email),
    address: text(input.address),
    social: (Array.isArray(input.social) ? input.social : []).map((link) => ({
      platform: isRecord(link) ? text(link.platform) : "",
      url: isRecord(link) ? text(link.url) : "",
    })),
  }

  if (!values.name) fieldErrors.name = "Enter the Site name."
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    fieldErrors["contact.email"] = "Enter a valid email address."
  }
  values.social.forEach((link, index) => {
    if (!SOCIAL_PLATFORMS.some((p) => p.value === link.platform)) {
      fieldErrors[`social.${index}.platform`] = "Choose a platform."
    }
    if (!isHttpUrl(link.url)) fieldErrors[`social.${index}.url`] = URL_ERROR
  })

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, fieldErrors }
    : { ok: true, values }
}

/** The stored Brand as form values. */
export function brandToValues(brand: Brand): BrandValues {
  return {
    name: brand.name ?? "",
    tagline: brand.tagline ?? "",
    logo: mediaId(brand.logo),
    phone: brand.contact?.phone ?? "",
    email: brand.contact?.email ?? "",
    address: brand.contact?.address ?? "",
    social: (brand.social ?? []).map(({ platform, url }) => ({
      platform,
      url,
    })),
  }
}

/** Validated form values as Brand data for the Local API. */
export function brandValuesToData(values: BrandValues) {
  return {
    name: values.name,
    tagline: values.tagline || null,
    logo: values.logo,
    contact: {
      phone: values.phone || null,
      email: values.email || null,
      address: values.address || null,
    },
    social: values.social.map(({ platform, url }) => ({
      platform: platform as SocialPlatform,
      url,
    })),
  }
}
