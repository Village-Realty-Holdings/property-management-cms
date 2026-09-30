import { Suspense } from "react"
import type { Metadata } from "next"
import { ImageIcon, UploadIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"

import { MediaDeleteButton } from "@/admin/components/MediaDeleteButton"
import { UploadForm } from "@/admin/components/UploadForm"
import { CardSkeleton, EmptyState, PageHeader } from "@/admin/kit"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Media" }

/** The Media library: upload images, see and delete them. */
export default function MediaLibrary() {
  return (
    <>
      <PageHeader
        title="Media"
        description="The images you use on Pages, Layouts, the Brand and SEO."
        action={
          <a href="#upload" className={buttonVariants()}>
            <UploadIcon aria-hidden="true" /> Upload Media
          </a>
        }
      />
      <div className="flex flex-col gap-6">
        <UploadForm />
        <Suspense fallback={<CardSkeleton lines={4} label="Loading Media" />}>
          <MediaGrid />
        </Suspense>
      </div>
    </>
  )
}

async function MediaGrid() {
  const { payload, as } = await requireStaff()
  const { docs } = await payload.find({
    collection: "media",
    sort: "-updatedAt",
    limit: 500,
    depth: 0,
    ...as,
  })

  if (docs.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon />}
        title="No images yet"
        description="Upload an image to use it on Pages, the Brand and SEO."
        action={
          <a href="#upload" className={buttonVariants()}>
            <UploadIcon aria-hidden="true" /> Upload Media
          </a>
        }
      />
    )
  }
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {docs.map((doc) => (
        <li
          key={doc.id}
          className="flex flex-col overflow-hidden rounded-xl border bg-background"
        >
          {doc.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.url}
              alt={doc.alt}
              className="aspect-4/3 w-full bg-muted object-cover"
            />
          )}
          <div className="flex items-start justify-between gap-2 p-3">
            <div className="flex min-w-0 flex-col">
              <span
                className="truncate text-sm font-medium"
                title={doc.filename ?? undefined}
              >
                {doc.filename}
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {doc.alt}
              </span>
            </div>
            <MediaDeleteButton id={doc.id} filename={doc.filename ?? "image"} />
          </div>
        </li>
      ))}
    </ul>
  )
}
