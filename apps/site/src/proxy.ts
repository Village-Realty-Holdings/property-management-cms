import { NextResponse, type NextRequest } from "next/server"

import { ADMIN_PATH_HEADER } from "./admin/adminPath"
import { EDIT_PARAM } from "./site/editing/flag"

/**
 * Two jobs:
 *
 *  - An Admin request gets its path passed to the render (see
 *    admin/adminPath.ts).
 *  - A Site request with the editing flag (the Visual Editor's canvas, see
 *    site/editing) is marked noindex in its response headers, beside the
 *    route's own robots meta. The flag is checked against the session in the
 *    route itself; the header is set whoever asks, which only ever makes the
 *    response safer. The response is uncached because the route is dynamic
 *    (it reads the session), for which Next sends `no-cache`/`no-store`; a
 *    Cache-Control set here would be overwritten, so none is.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set(
    ADMIN_PATH_HEADER,
    request.nextUrl.pathname + request.nextUrl.search
  )
  const response = NextResponse.next({ request: { headers } })
  if (request.nextUrl.searchParams.has(EDIT_PARAM)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
  }
  return response
}

export const config = {
  matcher: [
    "/admin/:path*",
    // Matcher values must be constants Next can read at build time, so the
    // key is written out here; proxy.test.ts checks it is EDIT_PARAM.
    { source: "/:path*", has: [{ type: "query", key: "__edit" }] },
  ],
}
