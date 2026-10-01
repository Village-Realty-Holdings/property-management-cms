/**
 * Legacy URLs: how a Site's previous website addressed its pages, so old
 * links and search results land on the new URLs (Sites `legacyUrls` tab).
 * Shared by the CMS (field options and validation) and apps/site's proxy
 * (matching). Pure: no Next.js or Payload imports.
 */

/**
 * The URL scheme the previous website used for Property pages. Stored by key
 * (not the pattern itself) so the CMS select stays a plain enum.
 */
export type LegacyPropertyPattern =
  | "none"
  | "cabin-rentals"
  | "property-details"
  | "rentals"
  | "root"

export const legacyPropertyPatterns: readonly {
  value: LegacyPropertyPattern
  label: string
}[] = [
  { value: "none", label: "None" },
  { value: "cabin-rentals", label: "/cabin-rentals/{slug}" },
  { value: "property-details", label: "/property-details/{slug}" },
  { value: "rentals", label: "/rentals/{slug} (same as the new URLs)" },
  { value: "root", label: "/{slug} (root level)" },
]

/** A one-off redirect for a legacy page: both are paths ("/old-page"). */
export type LegacyRedirect = { from: string; to: string }

/** The Site's legacy URL settings (`site.legacyUrls.*`). */
export type LegacyUrlSettings = {
  propertyPattern: LegacyPropertyPattern
  redirects: LegacyRedirect[]
}

export const noLegacyUrls: LegacyUrlSettings = {
  propertyPattern: "none",
  redirects: [],
}

/**
 * First path segments the new Site owns. Legacy URLs never redirect these,
 * and one-off redirects can't start with them.
 */
export const canonicalSegments: readonly string[] = [
  "rentals",
  "areas",
  "lists",
  "guides",
  "specials",
  "search",
  "api",
  "_next",
]

const patternPrefix: Partial<Record<LegacyPropertyPattern, string>> = {
  "cabin-rentals": "cabin-rentals",
  "property-details": "property-details",
}

const slugPattern = /^[a-z0-9][a-z0-9-]*$/

export function isLegacyPropertyPattern(
  value: unknown
): value is LegacyPropertyPattern {
  return legacyPropertyPatterns.some((p) => p.value === value)
}

/**
 * A path as compared for redirects: decoded, lowercased, without a trailing
 * slash, query or hash. Null when it isn't a path ("/…").
 */
export function normalizeLegacyPath(path: string): string | null {
  const bare = path.trim().split(/[?#]/)[0] ?? ""
  if (!bare.startsWith("/") || bare.startsWith("//")) return null
  let decoded = bare
  try {
    decoded = decodeURI(bare)
  } catch {
    // Malformed escapes: compare as sent.
  }
  const trimmed = decoded.replace(/\/+$/, "")
  return (trimmed || "/").toLowerCase()
}

/** Whether the path belongs to one of the new Site's own route prefixes. */
export function isCanonicalPath(path: string): boolean {
  const first = path.split("/")[1]?.toLowerCase() ?? ""
  return canonicalSegments.includes(first)
}

/** Settings as stored (any shape) to `LegacyUrlSettings`, dropping bad rows. */
export function legacyUrlSettingsFrom(raw: unknown): LegacyUrlSettings {
  if (!raw || typeof raw !== "object") return noLegacyUrls
  const { propertyPattern, redirects } = raw as {
    propertyPattern?: unknown
    redirects?: unknown
  }
  return {
    propertyPattern: isLegacyPropertyPattern(propertyPattern)
      ? propertyPattern
      : "none",
    redirects: (Array.isArray(redirects) ? redirects : []).flatMap((row) => {
      const { from, to } = (row ?? {}) as { from?: unknown; to?: unknown }
      if (typeof from !== "string" || typeof to !== "string") return []
      return validateLegacyRedirect(from, to) === true
        ? [{ from: from.trim(), to: to.trim() }]
        : []
    }),
  }
}

/** Whether a one-off redirect is usable; else why not (CMS validation). */
export function validateLegacyRedirect(
  from: string,
  to: string
): true | string {
  const source = normalizeLegacyPath(from)
  const target = normalizeLegacyPath(to)
  if (!source) return "“From” must be a path starting with /."
  if (!target) return "“To” must be a path starting with /."
  if (source === "/") return "The home page can't be redirected."
  if (isCanonicalPath(source))
    return `“From” can't be under /${source.split("/")[1]}: the new Site uses it.`
  if (source === target) return "“From” and “To” are the same path."
  return true
}

/**
 * Where one-off redirects take `path`: the final target, following a chain
 * (A → B, B → C gives C) so a visitor gets one hop. Undefined when no
 * redirect starts at `path`; false when the chain loops.
 */
function followRedirects(
  path: string,
  redirects: readonly LegacyRedirect[]
): string | false | undefined {
  const byFrom = new Map<string, string>()
  for (const r of redirects) {
    const from = normalizeLegacyPath(r.from)
    if (from && !byFrom.has(from)) byFrom.set(from, r.to)
  }
  let target = byFrom.get(path)
  if (target === undefined) return undefined
  const seen = new Set([path])
  for (;;) {
    const next = normalizeLegacyPath(target)
    if (!next) return target
    if (seen.has(next)) return false
    const further = byFrom.get(next)
    if (further === undefined) return target
    seen.add(next)
    target = further
  }
}

/**
 * The first loop among one-off redirects (e.g. /a → /b and /b → /a), as a
 * message for the CMS; true when there is none.
 */
export function validateLegacyRedirects(
  redirects: readonly { from?: unknown; to?: unknown }[]
): true | string {
  const rows = redirects.flatMap((r) =>
    typeof r?.from === "string" && typeof r?.to === "string"
      ? [{ from: r.from, to: r.to }]
      : []
  )
  for (const row of rows) {
    const from = normalizeLegacyPath(row.from)
    if (from && followRedirects(from, rows) === false)
      return `The redirect from ${row.from} leads back to itself through other redirects.`
  }
  return true
}

/**
 * What a request path means under the Site's legacy URLs:
 * - `redirect`: a one-off redirect, to `to`.
 * - `property`: a legacy Property URL, to /rentals/<slug>. With `verify`
 *   (the root-level pattern), redirect only when the slug is a real Property.
 * - null: not a legacy URL; serve it as is.
 */
export type LegacyMatch =
  | { kind: "redirect"; to: string }
  | { kind: "property"; slug: string; verify: boolean }
  | null

export function matchLegacyUrl(
  pathname: string,
  settings: LegacyUrlSettings
): LegacyMatch {
  const path = normalizeLegacyPath(pathname)
  if (!path || path === "/" || isCanonicalPath(path)) return null

  const redirect = followRedirects(path, settings.redirects)
  if (redirect === false) return null
  if (redirect) return { kind: "redirect", to: redirect }

  const segments = path.split("/").slice(1)
  const prefix = patternPrefix[settings.propertyPattern]
  if (prefix) {
    const [first, slug, ...rest] = segments
    if (first === prefix && slug && rest.length === 0 && slugPattern.test(slug))
      return { kind: "property", slug, verify: false }
    return null
  }
  if (settings.propertyPattern === "root") {
    const [slug, ...rest] = segments
    if (slug && rest.length === 0 && slugPattern.test(slug))
      return { kind: "property", slug, verify: true }
  }
  return null
}

/** The new URL of a Property page. */
export function propertyPath(slug: string): string {
  return `/rentals/${slug}`
}
