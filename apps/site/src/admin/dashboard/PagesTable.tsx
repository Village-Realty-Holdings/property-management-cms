import Link from "next/link"
import { FileTextIcon, SearchIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"

import { NewPageButton } from "../components/pageTemplates/NewPageButton"
import { ExportPageButton } from "../components/pages/PageTransfer"
import { EmptyState } from "../kit/EmptyState"
import type { PageRow } from "./rows"
import { StatusChip } from "./StatusChip"
import { UpdatedAt } from "./UpdatedAt"

/**
 * The Pages list: title, path, status, the Layout it uses, last updated, and
 * Export, which downloads the Page as a file another Site can import.
 * With no rows it offers New Page, or Clear search when a search found nothing.
 */
export function PagesTable({
  rows,
  query,
}: {
  rows: PageRow[]
  /** The search text that produced `rows`, if any. */
  query?: string
}) {
  if (rows.length === 0) {
    return query ? (
      <EmptyState
        icon={<SearchIcon />}
        title="No Pages match your search"
        description={`Nothing matches "${query}" in a title or path.`}
        action={
          <Link
            href="/admin/pages"
            className={buttonVariants({ variant: "outline" })}
          >
            Clear search
          </Link>
        }
      />
    ) : (
      <EmptyState
        icon={<FileTextIcon />}
        title="No Pages yet"
        description='Create the Home Page with the path "/" to start the Site.'
        action={<NewPageButton />}
      />
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <table className="w-full text-sm">
        <caption className="sr-only">
          {query ? `Pages matching "${query}"` : "Pages"}, newest change first
        </caption>
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Title
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Path
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Layout
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Updated
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b last:border-0 hover:bg-muted/50"
            >
              <th scope="row" className="px-4 py-3 text-left font-medium">
                <Link
                  href={`/admin/pages/${row.id}`}
                  className="hover:underline"
                >
                  {row.title}
                </Link>
                {row.isTemplate && (
                  <Badge variant="secondary" className="ml-2">
                    Page Template
                  </Badge>
                )}
              </th>
              <td className="px-4 py-3 font-mono text-xs">{row.path}</td>
              <td className="px-4 py-3">
                <StatusChip status={row.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">{row.layout}</td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                <UpdatedAt iso={row.updatedAt} />
              </td>
              <td className="px-4 py-2 text-right">
                <ExportPageButton id={row.id} title={row.title} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Server-side search: a plain GET form, so it works without JavaScript. */
export function PagesSearch({ query }: { query: string }) {
  return (
    <form
      role="search"
      action="/admin/pages"
      method="get"
      className="mb-4 flex max-w-md items-center gap-2"
    >
      <label htmlFor="pages-q" className="sr-only">
        Search Pages by title or path
      </label>
      <input
        id="pages-q"
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Search by title or path"
        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm placeholder:text-muted-foreground"
      />
      <button type="submit" className={buttonVariants({ variant: "outline" })}>
        Search
      </button>
      {query && (
        <Link
          href="/admin/pages"
          className={buttonVariants({ variant: "ghost" })}
        >
          Clear
        </Link>
      )}
    </form>
  )
}
