import type { Metadata } from "next"

import { PageEditor } from "@/admin/components/PageEditor"
import { mediaOptions } from "@/admin/media"
import { emptyBlock, emptyPage } from "@/admin/pageForm"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "New Page" }

/** A new Page, starting with a Hero. */
export default async function NewPage() {
  const staff = await requireStaff()
  return (
    <PageEditor
      id={null}
      status="new"
      initial={{ ...emptyPage, layout: [emptyBlock("hero")] }}
      media={await mediaOptions(staff)}
    />
  )
}
