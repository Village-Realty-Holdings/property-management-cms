import type { Metadata } from "next"

import { newPageDocument, newPagePath } from "@/admin/editor/modes/pageDocument"
import {
  loadLayoutOptions,
  loadPickers,
} from "@/admin/editor/modes/loadPageMode"
import { PageMode } from "@/admin/editor/modes/PageMode"
import { loadPageTemplateStart } from "@/admin/pageTemplates"
import { requireStaff } from "@/admin/session"
import { editingUrl } from "@/site/editing/flag"

export const metadata: Metadata = { title: "New Page" }

type Props = { searchParams: Promise<{ template?: string | string[] }> }

/**
 * A New Page, in the Visual Editor's Page mode: "Untitled Page" with a Hero,
 * or with a copy of a Page Template's Blocks and its Layout choice
 * (`?template=<id>`, a Page's id; one that is gone or is no longer a Page
 * Template gives the blank Page). It is not created until its
 * first Save, so opening New Page and leaving leaves nothing behind.
 */
export default async function NewPage({ searchParams }: Props) {
  const { template } = await searchParams
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
  const blank = newPageDocument(newPagePath(docs.map((doc) => doc.path)))
  const start =
    typeof template === "string"
      ? await loadPageTemplateStart(payload, as, Number(template))
      : null
  const initial = start ? { ...blank, ...start } : blank

  return (
    <PageMode
      id={null}
      initial={initial}
      status="draft"
      layouts={await loadLayoutOptions(payload)}
      dependents={[]}
      canvasSrc={editingUrl(initial.path)}
      {...await loadPickers(staff)}
    />
  )
}
