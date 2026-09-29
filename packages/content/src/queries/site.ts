import {
  effectiveStayPolicy,
  legacyUrlSettingsFrom,
  variableValuesFrom,
} from "../shared"
import type {
  Branding,
  FontPairing,
  NavLink,
  SiteSettings,
  SocialPlatform,
} from "../types"
import type { AmenityDoc, PageDocRaw, PropertyTypeDoc, SiteDoc } from "./docs"
import { mediaImage, presentAmenities, propertyType, text } from "./map"
import {
  amenityPopulate,
  loadSite,
  propertyTypePopulate,
  type QueryContext,
} from "./context"

const fontPairings: readonly FontPairing[] = ["classic", "modern", "rustic"]
const platforms: readonly SocialPlatform[] = [
  "facebook",
  "instagram",
  "x",
  "youtube",
  "tiktok",
]
const hexColor = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

const httpUrl = (value: string | null | undefined) => {
  const url = text(value)
  return url && /^https?:\/\//i.test(url) ? url : null
}

/** The deployment's Site Settings. */
export async function getSiteSettings(
  ctx: QueryContext
): Promise<SiteSettings> {
  const [site, vocabulary, types, navigation] = await Promise.all([
    loadSite(ctx),
    ctx.client.find<AmenityDoc>("amenities", {
      select: amenityPopulate,
      depth: 0,
      pagination: false,
    }),
    ctx.client.find<PropertyTypeDoc>("property-types", {
      // Not `not_equals: "withdrawn"`, which would skip NULLs in SQL.
      where: {
        or: [{ status: { equals: "active" } }, { status: { exists: false } }],
      },
      select: propertyTypePopulate,
      depth: 0,
      pagination: false,
      sort: "name",
    }),
    navigationLinks(ctx),
  ])

  const amenities = presentAmenities(site, vocabulary.docs)
  const branding = mapBranding(site, ctx.client.baseURL)
  return {
    slug: site.slug,
    name: site.name,
    domain: text(site.domain),
    branding,
    client: {
      name: text(site.client?.name),
      url: httpUrl(site.client?.website),
    },
    variables: variableValuesFrom(site),
    navigation,
    contact: {
      email: branding.email ?? null,
      phone: branding.phone ?? null,
    },
    amenities,
    amenityFilters: amenities.filter((a) => a.filter),
    propertyTypes: types.docs.flatMap((doc) => {
      const type = propertyType(site, doc)
      return type ? [type] : []
    }),
    stayPolicyDefaults: effectiveStayPolicy(null, site),
    legacyUrls: legacyUrlSettingsFrom(site.legacyUrls),
  }
}

/**
 * Published Pages with "Show in navigation", by navigation order. Published
 * even in a Preview: navigation shows what's live.
 */
async function navigationLinks(ctx: QueryContext): Promise<NavLink[]> {
  const { docs } = await ctx.client.find<PageDocRaw>("pages", {
    where: { showInNav: { equals: true } },
    select: { title: true, path: true, navOrder: true },
    depth: 0,
    pagination: false,
    sort: ["navOrder", "title"],
  })
  return docs.map((page) => ({ label: page.title, href: page.path }))
}

export function mapBranding(site: SiteDoc, baseURL: string): Branding {
  const raw = site.branding ?? {}
  const branding: Branding = {
    logo: mediaImage(raw.logo, baseURL, site.name),
    social: (raw.social ?? []).flatMap((row) => {
      const platform = row.platform as SocialPlatform
      const url = text(row.url)
      return platforms.includes(platform) && url ? [{ platform, url }] : []
    }),
  }
  const primaryColor = text(raw.primaryColor)
  if (primaryColor && hexColor.test(primaryColor))
    branding.primaryColor = primaryColor
  const accentColor = text(raw.accentColor)
  if (accentColor && hexColor.test(accentColor))
    branding.accentColor = accentColor
  const fontPairing = raw.fontPairing as FontPairing
  if (fontPairings.includes(fontPairing)) branding.fontPairing = fontPairing
  for (const key of ["tagline", "phone", "email", "address"] as const) {
    const value = text(raw[key])
    if (value) branding[key] = value
  }
  return branding
}
