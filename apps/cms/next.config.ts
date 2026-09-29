import { withPayload } from "@payloadcms/next/withPayload"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // ADR-0006: apps/cms renders no public pages; the root goes to the admin.
  async redirects() {
    return [{ source: "/", destination: "/admin", permanent: false }]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
