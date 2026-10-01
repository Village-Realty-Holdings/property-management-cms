import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { derivePageStatus } from "@/admin/dashboard/pageStatus"
import { pageDocumentFromPage } from "@/admin/editor/modes/pageDocument"
import {
  loadLayoutOptions,
  loadPickers,
} from "@/admin/editor/modes/loadPageMode"
import { PageMode } from "@/admin/editor/modes/PageMode"
import { requireStaff } from "@/admin/session"
import { loadPageDependents } from "@/admin/usage"
import { editingUrl } from "@/site/editing/flag"

export const metadata: Metadata = { title: "Edit Page" }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string | string[] }>
}

/**
 * A Page's latest Draft, in the Visual Editor's Page mode. `?tab=page` opens
 * the Page tab, which is where the SEO screen's links go.
 */
export default async function EditPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab } = await searchParams
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

  const [layouts, pickers, dependents] = await Promise.all([
    loadLayoutOptions(payload),
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
      layouts={layouts}
      initialTab={tab === "page" ? "page" : undefined}
      dependents={dependents}
      canvasSrc={editingUrl(draft.path)}
      {...pickers}
    />
  )
}
