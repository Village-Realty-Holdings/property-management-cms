import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ImageIcon, SearchIcon, UploadIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"

import { MediaDeleteButton } from "@/admin/components/MediaDeleteButton"
import { MediaEditSheet } from "@/admin/components/MediaEditSheet"
import { MediaSearch, mediaHref } from "@/admin/components/MediaSearch"
import { Pagination, pageParam } from "@/admin/components/Pagination"
import { UploadForm } from "@/admin/components/UploadForm"
import { CardSkeleton, EmptyState, PageHeader } from "@/admin/kit"
import { loadMediaPage } from "@/admin/media"
import { requireUser } from "@/admin/session"
import { loadMediaDependents } from "@/admin/usage"

export const metadata: Metadata = { title: "Media" }

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

/** The Media library: upload images, search and page through them, edit and delete them. */
export default async function MediaLibrary({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { q, page } = await searchParams
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? ""
  const pageNumber = pageParam(page)
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
        <div>
          <MediaSearch query={query} />
          <Suspense
            key={`${query}|${pageNumber}`}
            fallback={<CardSkeleton lines={4} label="Loading Media" />}
          >
            <MediaGrid query={query} page={pageNumber} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

async function MediaGrid({ query, page }: { query: string; page: number }) {
  const { payload, as } = await requireUser()
  const [result, usedBy] = await Promise.all([
    loadMediaPage(payload, as, { q: query, page }),
    loadMediaDependents(payload, as),
  ])
  const { docs } = result

  if (docs.length === 0 && query) {
    return (
      <EmptyState
        icon={<SearchIcon />}
        title="No images match your search"
        description={`Nothing matches "${query}" in alt text or a file name.`}
        action={
          <Link
            href="/admin/media"
            className={buttonVariants({ variant: "outline" })}
          >
            Clear search
          </Link>
        }
      />
    )
  }
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
    <>
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
              <div className="flex shrink-0">
                <MediaEditSheet
                  media={{
                    id: doc.id,
                    filename: doc.filename ?? "image",
                    url: doc.thumbnailURL ?? doc.url,
                    alt: doc.alt,
                    caption: doc.caption,
                    credit: doc.credit,
                    author: doc.attribution?.author,
                    sourceUrl: doc.attribution?.sourceUrl,
                    licence: doc.attribution?.licence,
                  }}
                />
                <MediaDeleteButton
                  id={doc.id}
                  filename={doc.filename ?? "image"}
                  dependents={usedBy.get(doc.id) ?? []}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        href={(p) => mediaHref({ q: query, page: p })}
      />
    </>
  )
}
