import { withPayload } from "@payloadcms/next/withPayload"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // On Workers (ADR-0015) pg connects through pg-cloudflare, which Node's
  // resolution never reaches, so file tracing misses it and OpenNext's
  // bundle step fails without it.
  outputFileTracingIncludes: {
    "/**": [
      "../../node_modules/.pnpm/pg-cloudflare@*/node_modules/pg-cloudflare/dist/**",
    ],
  },
  // Preview (ADR-0018) renders the Site's views from these packages.
  transpilePackages: [
    "@workspace/ui",
    "@workspace/content",
    "@workspace/site-views",
  ],
  // Preview images load straight from their source in the Editor's browser:
  // Media on the CMS with the Editor's session, Feed photos from their hosts.
  // Nothing to optimize, and no image fetches from the server.
  images: { unoptimized: true },
  // ADR-0006: apps/cms renders no public pages; the root goes to the admin.
  async redirects() {
    return [{ source: "/", destination: "/admin", permanent: false }]
  },
  // Previews show Drafts: never cached, never indexed.
  async headers() {
    return [
      {
        source: "/preview/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
