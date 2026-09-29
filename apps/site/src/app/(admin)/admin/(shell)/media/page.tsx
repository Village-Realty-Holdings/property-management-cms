import type { Metadata } from "next"
import { Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { deleteMedia } from "@/admin/actions/media"
import { UploadForm } from "@/admin/components/UploadForm"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Media" }

/** The Media library: upload images, see and delete them. */
export default async function MediaLibrary() {
  const { payload, as } = await requireStaff()
  const { docs } = await payload.find({
    collection: "media",
    sort: "-updatedAt",
    limit: 500,
    depth: 0,
    ...as,
  })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Media</h1>
      <UploadForm />
      {docs.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-background p-10 text-center text-sm text-muted-foreground">
          No images yet. Upload one to use it in Pages and Site Settings.
        </p>
      ) : (
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
                <form action={deleteMedia}>
                  <input type="hidden" name="id" value={doc.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${doc.filename}`}
                  >
                    <Trash2Icon />
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
