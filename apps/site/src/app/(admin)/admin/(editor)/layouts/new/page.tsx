import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createUntitledLayout } from "@/admin/layouts/layoutScreen"
import { requireUser } from "@/admin/session"

export const metadata: Metadata = { title: "New Layout" }

// Opening this address makes a Layout, so it is never prerendered or cached.
export const dynamic = "force-dynamic"

/**
 * "New Layout": makes an "Untitled Layout" from the default Layout's content
 * and opens it in the Visual Editor, where it is named and given its Blocks
 * and paths. It is live on save like any Layout, and no Page uses it until a
 * Page picks it or a path covers the Page.
 */
export default async function NewLayout() {
  const { payload, as } = await requireUser()
  const id = await createUntitledLayout(payload, as)
  redirect(`/admin/layouts/${id}`)
}
