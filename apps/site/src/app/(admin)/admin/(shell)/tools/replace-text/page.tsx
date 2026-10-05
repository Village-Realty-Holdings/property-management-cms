import type { Metadata } from "next"

import { ReplaceTextForm } from "@/admin/components/replace/ReplaceTextForm"
import { requireUser } from "@/admin/session"

export const metadata: Metadata = { title: "Replace Text" }

/** Replace Text: change a word or phrase across every Page and Layout. */
export default async function ReplaceTextPage() {
  await requireUser()
  return <ReplaceTextForm />
}
