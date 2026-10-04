import type { Metadata } from "next"

import { BrandForm } from "@/admin/components/BrandForm"
import { mediaOptions } from "@/admin/media"
import { requireUser } from "@/admin/session"
import { loadBrand } from "@/admin/settingsSave"

export const metadata: Metadata = { title: "Brand" }

/** The Brand: the Site's name, logo, contact details and social links. */
export default async function BrandPage() {
  const session = await requireUser()
  const [initial, media] = await Promise.all([
    loadBrand(session.payload, session.as),
    mediaOptions(session),
  ])
  return <BrandForm initial={initial} media={media} />
}
