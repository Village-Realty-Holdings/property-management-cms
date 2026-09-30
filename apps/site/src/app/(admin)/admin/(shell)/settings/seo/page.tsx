import type { Metadata } from "next"

import { SeoForm } from "@/admin/components/SeoForm"
import { mediaOptions } from "@/admin/media"
import { getPagesNeedingSeoAttention } from "@/admin/seoHealth"
import { requireStaff } from "@/admin/session"
import { loadBrand, loadSeo } from "@/admin/settingsSave"

import { PagesNeedingAttention } from "./PagesNeedingAttention"

export const metadata: Metadata = { title: "SEO" }

/** SEO: the Site's search and sharing defaults, and the Pages that need SEO text. */
export default async function SeoPage() {
  const staff = await requireStaff()
  const [initial, brand, media, attention] = await Promise.all([
    loadSeo(staff.payload, staff.as),
    loadBrand(staff.payload, staff.as),
    mediaOptions(staff),
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
