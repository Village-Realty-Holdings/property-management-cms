import type { NextConfig } from "next"

type RemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number]

/**
 * Editorial Media on R2/S3 is served from S3_PUBLIC_URL (the same value the
 * CMS uses to build Media URLs, ADR-0008). Optional: unset in dev, where the
 * CMS serves Media itself.
 */
function mediaPattern(): RemotePattern[] {
  const raw = process.env.S3_PUBLIC_URL
  if (!raw) return []
  const url = new URL(raw)
  return [
    {
      protocol: url.protocol === "http:" ? "http" : "https",
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/+$/, "")}/**`,
    },
  ]
}

/**
 * The CMS serving Media from local disk (dev), from CMS_URL. Falls back to
 * localhost:3000, the CMS's default dev port.
 */
function cmsMediaPattern(): RemotePattern {
  const url = new URL(process.env.CMS_URL || "http://localhost:3000")
  return {
    protocol: url.protocol === "http:" ? "http" : "https",
    hostname: url.hostname,
    port: url.port,
    pathname: "/api/media/**",
  }
}

const nextConfig: NextConfig = {
  // Lets a second `next dev` (another Site) run from this app dir locally.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // 'use cache' + cacheTag/cacheLife in @workspace/content (ADR-0009).
  cacheComponents: true,
  transpilePackages: [
    "@workspace/ui",
    "@workspace/content",
    "@workspace/site-views",
  ],
  images: {
    remotePatterns: [
      // Demo Feed photos.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      cmsMediaPattern(),
      ...mediaPattern(),
    ],
    // Lets `next dev` optimize Media from the CMS on localhost. Never in
    // production builds (SSRF risk).
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
}

export default nextConfig
