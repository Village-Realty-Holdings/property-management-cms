import { NextResponse, type NextRequest } from "next/server"

import { ADMIN_PATH_HEADER } from "./admin/adminPath"

/** Passes the requested Admin path to the render (see admin/adminPath.ts). */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set(
    ADMIN_PATH_HEADER,
    request.nextUrl.pathname + request.nextUrl.search
  )
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: "/admin/:path*",
}
