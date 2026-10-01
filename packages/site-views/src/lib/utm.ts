/**
 * UTM parameters on links to the Client's website, as pclodge-landing's
 * `withUtm` adds them, with the Site's slug for the landing page's. Pure, no
 * imports, so `node --test` runs utm.test.ts directly.
 */

/** Where on a Tuck-In Page a link to the Client's website sits. */
export type UtmContent =
  | "logo"
  | "footer_logo"
  | `${"owner" | "guest"}_${"cta_button" | "text_link"}`

/** `url` with utm_source, utm_medium, utm_campaign and utm_content set. */
export function withUtm(
  url: string,
  slug: string,
  content: UtmContent
): string {
  const u = new URL(url)
  u.searchParams.set("utm_source", "website")
  u.searchParams.set("utm_medium", `${slug}_landing_page`)
  u.searchParams.set("utm_campaign", `${slug}_landing_page`)
  u.searchParams.set("utm_content", content)
  return u.toString()
}

const host = (url: string): string | null => {
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === "http:" || protocol === "https:"
      ? hostname.toLowerCase().replace(/^www\./, "")
      : null
  } catch {
    return null
  }
}

/** Whether `href` is on the Client's website (same host, with or without www). */
export function isClientUrl(href: string, clientUrl: string | null): boolean {
  if (!clientUrl) return false
  const client = host(clientUrl)
  return client !== null && host(href) === client
}

/**
 * A link's href with UTM parameters when it points at the Client's website;
 * any other link unchanged.
 */
export function clientLink(
  href: string,
  site: { slug: string; clientUrl: string | null },
  content: UtmContent
): string {
  return isClientUrl(href, site.clientUrl)
    ? withUtm(href, site.slug, content)
    : href
}
