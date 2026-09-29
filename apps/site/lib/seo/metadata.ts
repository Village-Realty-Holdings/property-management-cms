import type { Metadata } from "next"

import type { Image, Seo, SiteSettings } from "@workspace/content"

/**
 * Metadata helpers for the Site's pages. Relative URLs (canonical, OG image
 * paths) resolve against `metadataBase`, the Site's own origin.
 */

/** Used when the Site has no domain yet (e.g. a fresh CMS Site). */
const fallbackOrigin = "http://localhost"

/**
 * The Site's public origin from its CMS `domain` ("www.example.com" →
 * "https://www.example.com"). Tolerates a stored scheme or trailing slash.
 */
export function siteOrigin(settings: Pick<SiteSettings, "domain">): string {
  const domain = settings.domain?.trim()
  if (!domain) return fallbackOrigin
  const withScheme = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`
  try {
    return new URL(withScheme).origin
  } catch {
    return fallbackOrigin
  }
}

/** An absolute URL on the Site for a Site-relative path. */
export function absoluteUrl(
  settings: Pick<SiteSettings, "domain">,
  path: string
): string {
  return new URL(path, `${siteOrigin(settings)}/`).toString()
}

function ogImages(image: Image | null | undefined) {
  return image
    ? [
        {
          url: image.url,
          alt: image.alt,
          ...(image.width ? { width: image.width } : {}),
          ...(image.height ? { height: image.height } : {}),
        },
      ]
    : undefined
}

/**
 * The Site's base metadata, for the root layout: title template
 * "%s | <Site name>", description, Open Graph and Twitter defaults and
 * `metadataBase`. Pass `path` for a page's canonical URL; a layout should
 * not, since children inherit it.
 */
export function siteMetadata(
  settings: SiteSettings,
  { path }: { path?: string } = {}
): Metadata {
  const { name } = settings
  const tagline = settings.branding.tagline ?? null
  const description = tagline ?? `Vacation rentals from ${name}.`
  const images = ogImages(settings.branding.logo)
  return {
    metadataBase: new URL(siteOrigin(settings)),
    title: {
      default: tagline ? `${name}: ${tagline}` : name,
      template: `%s | ${name}`,
    },
    description,
    applicationName: name,
    openGraph: {
      siteName: name,
      type: "website",
      locale: "en_US",
      description,
      ...(images ? { images } : {}),
    },
    twitter: { card: images ? "summary_large_image" : "summary" },
    ...(path ? { alternates: { canonical: path } } : {}),
  }
}

/**
 * A page's metadata: its SEO group (title/description/image) over the given
 * fallbacks, with its canonical path. The title goes through the layout's
 * template.
 */
export function pageMetadata({
  path,
  title,
  description,
  image,
  seo,
}: {
  /** Site-relative canonical path, e.g. "/rentals/bear-hollow-lodge". */
  path: string
  title: string
  description?: string | null
  image?: Image | null
  seo?: Seo | null
}): Metadata {
  const finalTitle = seo?.title ?? title
  const finalDescription = seo?.description ?? description ?? undefined
  const images = ogImages(seo?.image ?? image)
  return {
    title: finalTitle,
    ...(finalDescription ? { description: finalDescription } : {}),
    alternates: { canonical: path },
    openGraph: {
      title: finalTitle,
      url: path,
      ...(finalDescription ? { description: finalDescription } : {}),
      ...(images ? { images } : {}),
    },
  }
}
