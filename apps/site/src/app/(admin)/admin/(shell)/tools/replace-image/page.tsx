import type { Metadata } from "next"

import { ReplaceImageForm } from "@/admin/components/replace/ReplaceImageForm"
import { mediaOptions } from "@/admin/media"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Replace Image" }

/** Replace Image: swap one Media image for another wherever it is shown. */
export default async function ReplaceImagePage() {
  const staff = await requireStaff()
  return <ReplaceImageForm media={await mediaOptions(staff)} />
}
