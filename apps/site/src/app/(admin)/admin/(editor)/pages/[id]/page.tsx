import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { derivePageStatus } from "@/admin/dashboard/pageStatus"
import { pageDocumentFromPage } from "@/admin/editor/modes/pageDocument"
import {
  loadPickers,
  resolvePageLayout,
} from "@/admin/editor/modes/loadPageMode"
import { PageMode } from "@/admin/editor/modes/PageMode"
import { requireStaff } from "@/admin/session"
import { loadPageDependents } from "@/admin/usage"
import { editingUrl } from "@/site/editing/flag"

export const metadata: Metadata = { title: "Edit Page" }

type Props = { params: Promise<{ id: string }> }

/** A Page's latest Draft, in the Visual Editor's Page mode. */
export default async function EditPage({ params }: Props) {
  const { id } = await params
  const staff = await requireStaff()
  const { payload, as } = staff

  const pageId = Number(id)
  if (!Number.isInteger(pageId)) notFound()
  const draft = await payload
    .findByID({ collection: "pages", id: pageId, draft: true, depth: 0, ...as })
    .catch(() => null)
  if (!draft) notFound()
  const published = await payload.findByID({
    collection: "pages",
    id: pageId,
    depth: 0,
    ...as,
  })

  const [layout, pickers, dependents] = await Promise.all([
    resolvePageLayout(payload, draft),
    loadPickers(staff),
    loadPageDependents(payload, as, { id: pageId, path: draft.path }),
  ])

  return (
    <PageMode
      key={pageId}
      id={pageId}
      initial={pageDocumentFromPage(draft)}
      status={derivePageStatus({
        published: published._status,
        latest: draft._status,
      })}
      layout={layout}
      dependents={dependents}
      canvasSrc={editingUrl(draft.path)}
      {...pickers}
    />
  )
}
