import type { Metadata } from "next"

import { ReplaceImageForm } from "@/admin/components/replace/ReplaceImageForm"
import { mediaOptions } from "@/admin/media"
import { requireUser } from "@/admin/session"

export const metadata: Metadata = { title: "Replace Image" }

/** Replace Image: swap one Media image for another wherever it is shown. */
export default async function ReplaceImagePage() {
  const session = await requireUser()
  return <ReplaceImageForm media={await mediaOptions(session)} />
}
