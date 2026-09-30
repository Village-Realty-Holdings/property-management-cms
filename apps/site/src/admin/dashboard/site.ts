import { siteSchema } from "../../database"
import { resolveSiteUrl } from "../../site/seo"
import type { LiveTheme } from "../../theme/record"
import type { Brand, Image } from "../../site/brand"

type Env = Record<string, string | undefined>

/** The Site as the sidebar and the Dashboard's Site card show it. */
export type SiteCard = {
  name: string
  logo: Image | null
  /** The Site's host from `SITE_URL`, or null when that is not a valid origin. */
  domain: string | null
  /** Where View Site goes: the Site's origin, or "/" without a valid one. */
  url: string
  /** The Postgres schema this deployment uses, or "public". */
  schema: string
}

export function siteCardOf(brand: Brand, env: Env = process.env): SiteCard {
  let domain: string | null = null
  let url = "/"
  try {
    const origin = resolveSiteUrl(env.SITE_URL?.trim() || undefined, {
      production: false,
    })
    domain = new URL(origin).host
    url = origin
  } catch {
    // An invalid SITE_URL is reported by the Site itself; the Admin still opens.
  }
  let schema: string | undefined
  try {
    schema = siteSchema(env)
  } catch {
    // Same: an invalid DATABASE_SCHEMA stops the app before it gets here.
  }
  return {
    name: brand.name,
    logo: brand.logo,
    domain,
    url,
    schema: schema ?? "public",
  }
}

/** One colour of the Theme card. */
export type Swatch = { name: string; hex: string }

export type ThemeSummary = {
  swatches: Swatch[]
  /** When the Theme was last saved (ISO), or null while it is not customised. */
  savedAt: string | null
}

/**
 * What the Dashboard's Theme card shows: the live Theme's colours, and when
 * it was saved. Until one is saved these are the default preset's.
 */
export function themeSummaryOf(theme: LiveTheme): ThemeSummary {
  const { primary, accent, third, text } = theme.inputs
  return {
    swatches: [
      { name: "Primary", hex: primary },
      { name: "Accent", hex: accent },
      ...(third ? [{ name: "Third", hex: third }] : []),
      { name: "Text", hex: text },
    ],
    savedAt: theme.source === "saved" ? theme.savedAt : null,
  }
}

const savedFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

export function themeStatusLine(summary: ThemeSummary): string {
  return summary.savedAt
    ? `Last saved ${savedFormat.format(new Date(summary.savedAt))} UTC`
    : "Not customised yet"
}
