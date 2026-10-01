import { withPayload } from "@payloadcms/next/withPayload"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // On Workers (apps/cms ADR-0015) pg connects through pg-cloudflare, which
  // Node's resolution never reaches, so file tracing misses it and OpenNext's
  // bundle step fails without it.
  outputFileTracingIncludes: {
    "/**": [
      "../../node_modules/.pnpm/pg-cloudflare@*/node_modules/pg-cloudflare/dist/**",
    ],
  },
  transpilePackages: ["@workspace/ui"],
  turbopack: {
    resolveAlias: {
      // The Visual Editor's browser code imports the Blocks' Payload configs,
      // which import this server-only package (see the stub).
      "@payloadcms/richtext-lexical": {
        browser: "./src/fields/lexicalBrowserStub.ts",
      },
    },
  },
  // Media is served by Payload (local disk) or straight from R2. Resizing at
  // delivery comes with the Workers deploy (apps/cms ADR-0008).
  images: { unoptimized: true },
  // Media uploads from the Admin go through Server Actions.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
