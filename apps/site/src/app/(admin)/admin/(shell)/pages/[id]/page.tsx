import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Button } from "@workspace/ui/components/button"

import { deletePage, type PageIntent } from "@/admin/actions/pages"
import { PageEditor, type PageStatus } from "@/admin/components/PageEditor"
import { mediaOptions } from "@/admin/media"
import { pageToValues } from "@/admin/pageForm"
import { toMarkdown } from "@/admin/richText"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Edit Page" }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}

const savedMessages: Record<PageIntent, string> = {
  draft: "Draft saved.",
  publish: "Published. The Page is live on the Site.",
  unpublish: "Unpublished.",
}

/** Edits a Page's latest Draft. */
export default async function EditPage({ params, searchParams }: Props) {
  const { id } = await params
  const { saved } = await searchParams
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

  const status: PageStatus =
    main._status !== "published"
      ? "draft"
      : draft.updatedAt !== main.updatedAt
        ? "changed"
        : "published"

  const initial = await pageToValues(draft, (data) => toMarkdown(payload, data))
  const message =
    saved && saved in savedMessages
      ? savedMessages[saved as PageIntent]
      : undefined

  return (
    <div className="flex flex-col gap-10">
      <PageEditor
        id={pageId}
        initial={initial}
        status={status}
        media={await mediaOptions(staff)}
        initialState={message ? { ok: true, message } : {}}
      />
      <form action={deletePage} className="flex justify-end border-t pt-6">
        <input type="hidden" name="id" value={pageId} />
        <Button type="submit" variant="destructive">
          Delete Page
        </Button>
      </form>
    </div>
  )
}
