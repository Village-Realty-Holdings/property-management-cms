import type { Metadata } from "next"

import { ReplaceTextForm } from "@/admin/components/replace/ReplaceTextForm"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Replace Text" }

/** Replace Text: change a word or phrase across every Page and Layout. */
export default async function ReplaceTextPage() {
  await requireStaff()
  return <ReplaceTextForm />
}
