import type { Metadata } from "next"

import { newPageDocument, newPagePath } from "@/admin/editor/modes/pageDocument"
import {
  loadPickers,
  resolvePageLayout,
} from "@/admin/editor/modes/loadPageMode"
import { PageMode } from "@/admin/editor/modes/PageMode"
import { requireStaff } from "@/admin/session"
import { editingUrl } from "@/site/editing/flag"

export const metadata: Metadata = { title: "New Page" }

/**
 * A New Page, in the Visual Editor's Page mode: "Untitled Page" with a Hero.
 * It is not created until its first Save, so opening New Page and leaving
 * leaves nothing behind.
 */
export default async function NewPage() {
  const staff = await requireStaff()
  const { payload, as } = staff

  const { docs } = await payload.find({
    collection: "pages",
    where: { path: { like: "/untitled-page" } },
    pagination: false,
    depth: 0,
    select: { path: true },
    ...as,
  })
  const initial = newPageDocument(newPagePath(docs.map((doc) => doc.path)))

  return (
    <PageMode
      id={null}
      initial={initial}
      status="draft"
      layout={await resolvePageLayout(payload, {
        path: initial.path,
        layout: { mode: "route" },
      })}
      dependents={[]}
      canvasSrc={editingUrl(initial.path)}
      {...await loadPickers(staff)}
    />
  )
}
