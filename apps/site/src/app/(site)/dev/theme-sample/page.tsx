import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Blocks } from "@/site/blocks"
import { SAMPLE_BLOCKS } from "@/site/dev/samplePage"
import { ThemeSampleTriggers } from "@/site/dev/ThemeSampleTriggers"

export const metadata: Metadata = {
  title: "Theme sample",
  robots: { index: false, follow: false },
}

/**
 * A Theme test bench, outside production only: the sample Page's Blocks, then
 * the ui components a Theme restyles, with a dialog and a sheet that portal
 * out of the Site. The Theme acceptance tests (e2e/theme) drive it. In
 * production this path is not a route: it falls through to the Pages.
 */
export default function ThemeSamplePage() {
  if (process.env.NODE_ENV === "production") notFound()
  return (
    <>
      <Blocks blocks={SAMPLE_BLOCKS} />
      <ThemeSampleTriggers />
    </>
  )
}
