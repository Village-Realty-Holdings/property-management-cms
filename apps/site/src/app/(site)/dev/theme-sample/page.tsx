import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Blocks } from "@/site/blocks"
import { SAMPLE_BLOCKS } from "@/site/dev/samplePage"
import { ThemeSampleTriggers } from "@/site/dev/ThemeSampleTriggers"

export const metadata: Metadata = {
  title: "Theme sample",
  robots: { index: false, follow: false },
}

/** Passed the environment like the other dev-only switches (auth/devSignIn). */
function inProduction(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV === "production"
}

/**
 * A Theme test bench, outside production only: the sample Page's Blocks, then
 * the ui components a Theme restyles, with a dialog and a sheet that portal
 * out of the Site. The Theme acceptance tests (e2e/theme) drive it. In
 * production it answers 404.
 */
export default function ThemeSamplePage() {
  if (inProduction()) notFound()
  return (
    <>
      <Blocks blocks={SAMPLE_BLOCKS} />
      <ThemeSampleTriggers />
    </>
  )
}
