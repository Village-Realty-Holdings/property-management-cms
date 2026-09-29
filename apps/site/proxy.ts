import { NextResponse, type NextRequest } from "next/server"

import { getLegacyUrlSettings, isPropertySlug } from "@workspace/content/proxy"
import { matchLegacyUrl, propertyPath } from "@workspace/content/shared"

import { hasSite } from "@/lib/site"

/**
 * Legacy URL redirects (Site Settings, Legacy URLs tab): the previous
 * website's Property URLs and one-off pages 308 to their new URLs. Matching
 * is in @workspace/content/shared (legacyUrls.ts): the new Site's own routes
 * (/rentals, /areas, /lists, …) are never redirected.
 *
 * Next.js doesn't run `'use cache'` in the proxy, so the settings come from
 * `@workspace/content/proxy`, which keeps them in memory for a minute. The
 * root-level pattern (/{slug}) redirects only a slug that is an Active
 * Property and not a Page.
 */

/** Assets a legacy redirect never applies to (keeps the proxy off them). */
const assetPath =
  /\.(?:css|js|mjs|map|json|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|txt|xml|webmanifest)$/i

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!hasSite() || assetPath.test(pathname)) return NextResponse.next()

  try {
    const match = matchLegacyUrl(pathname, await getLegacyUrlSettings())
    if (!match) return NextResponse.next()
    if (match.kind === "redirect") return redirect(request, match.to)
    if (match.verify && !(await isPropertySlug(match.slug))) {
      return NextResponse.next()
    }
    return redirect(request, propertyPath(match.slug))
  } catch (error) {
    // The CMS being down must not take the Site down: serve the request.
    console.error("Legacy URL redirect skipped:", error)
    return NextResponse.next()
  }
}

/** A permanent (308) redirect to a Site-relative path, keeping the query. */
function redirect(request: NextRequest, to: string) {
  const target = new URL(to, request.nextUrl)
  // Only the Site itself: never an open redirect.
  if (target.origin !== request.nextUrl.origin) return NextResponse.next()
  if (!target.search) target.search = request.nextUrl.search
  return NextResponse.redirect(target, 308)
}

export const config = {
  // Not the API, Next.js internals or the metadata files.
  matcher: ["/((?!api/|_next/|favicon\\.ico$|sitemap\\.xml$|robots\\.txt$).*)"],
}
