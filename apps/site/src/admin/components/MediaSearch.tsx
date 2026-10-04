import Link from "next/link"

import { buttonVariants } from "@workspace/ui/components/button"

/** The Media library's URL for a search and page; page 1 and a blank search are left out. */
export function mediaHref({ q, page }: { q?: string; page?: number }): string {
  const params = new URLSearchParams()
  if (q?.trim()) params.set("q", q.trim())
  if (page !== undefined && page > 1) params.set("page", String(page))
  const s = params.toString()
  return "/admin/media" + (s ? `?${s}` : "")
}

/** Server-side search: a plain GET form, so it works without JavaScript. */
export function MediaSearch({ query }: { query: string }) {
  return (
    <form
      role="search"
      action="/admin/media"
      method="get"
      className="mb-4 flex max-w-md items-center gap-2"
    >
      <label htmlFor="media-q" className="sr-only">
        Search Media by alt text or file name
      </label>
      <input
        id="media-q"
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Search by alt text or file name"
        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm placeholder:text-muted-foreground"
      />
      <button type="submit" className={buttonVariants({ variant: "outline" })}>
        Search
      </button>
      {query && (
        <Link
          href="/admin/media"
          className={buttonVariants({ variant: "ghost" })}
        >
          Clear
        </Link>
      )}
    </form>
  )
}
