import type { Metadata } from "next"

import { BrandForm } from "@/admin/components/BrandForm"
import { mediaOptions } from "@/admin/media"
import { requireStaff } from "@/admin/session"
import { loadBrand } from "@/admin/settingsSave"

export const metadata: Metadata = { title: "Brand" }

/** The Brand: the Site's name, logo, contact details and social links. */
export default async function BrandPage() {
  const staff = await requireStaff()
  const [initial, media] = await Promise.all([
    loadBrand(staff.payload, staff.as),
    mediaOptions(staff),
  ])
  return <BrandForm initial={initial} media={media} />
}
