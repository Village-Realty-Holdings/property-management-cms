import type { Metadata } from "next"

import { SeoForm } from "@/admin/components/SeoForm"
import { mediaOptions } from "@/admin/media"
import { getPagesNeedingSeoAttention } from "@/admin/seoHealth"
import { requireUser } from "@/admin/session"
import { loadBrand, loadSeo } from "@/admin/settingsSave"

import { PagesNeedingAttention } from "./PagesNeedingAttention"

export const metadata: Metadata = { title: "SEO" }

/** SEO: the Site's search and sharing defaults, and the Pages that need SEO text. */
export default async function SeoPage() {
  const session = await requireUser()
  const [initial, brand, media, attention] = await Promise.all([
    loadSeo(session.payload, session.as),
    loadBrand(session.payload, session.as),
    mediaOptions(session),
    getPagesNeedingSeoAttention(),
  ])
  return (
    <>
      <SeoForm initial={initial} media={media} siteName={brand.name} />
      <div className="mt-6 max-w-3xl">
        <PagesNeedingAttention rows={attention} />
      </div>
    </>
  )
}
