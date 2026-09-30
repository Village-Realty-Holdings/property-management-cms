import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PageEditor } from "@/admin/components/PageEditor"
import { derivePageStatus } from "@/admin/dashboard/pageStatus"
import { mediaOptions } from "@/admin/media"
import { pageToValues } from "@/admin/pageForm"
import { toMarkdown } from "@/admin/richText"
import { requireStaff } from "@/admin/session"
import { loadPageDependents } from "@/admin/usage"

export const metadata: Metadata = { title: "Edit Page" }

type Props = { params: Promise<{ id: string }> }

/** Edits a Page's latest Draft. */
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
  const main = await payload.findByID({
    collection: "pages",
    id: pageId,
    depth: 0,
    ...as,
  })

  const status = derivePageStatus({
    published: main._status,
    latest: draft._status,
  })

  const initial = await pageToValues(draft, (data) => toMarkdown(payload, data))

  return (
    <PageEditor
      id={pageId}
      initial={initial}
      status={status}
      media={await mediaOptions(staff)}
      dependents={await loadPageDependents(payload, as, {
        id: pageId,
        path: draft.path,
      })}
    />
  )
}
