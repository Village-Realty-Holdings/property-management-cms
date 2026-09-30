import Link from "next/link"
import { CopyIcon, LayoutTemplateIcon, PlusIcon } from "lucide-react"

import { Button, buttonVariants } from "@workspace/ui/components/button"

import { EmptyState } from "../kit/EmptyState"
import { NEW_LAYOUT_HREF, type LayoutRow } from "./rows"
import { UpdatedAt } from "./UpdatedAt"

/** "used by 3 Pages", "used by 1 Page", "not used by any Page". */
export function usedByLabel(count: number): string {
  if (count === 0) return "Not used by any Page"
  return `Used by ${count} ${count === 1 ? "Page" : "Pages"}`
}

/**
 * The Layouts list: name, paths, how many Pages use it, last updated, and
 * Duplicate. `duplicate` is a Server Action taking the Layout's `id` in form
 * data; the Layouts collection (Phase 3) provides it.
 */
export function LayoutsTable({
  rows,
  duplicate,
}: {
  rows: LayoutRow[]
  duplicate: (formData: FormData) => void | Promise<void>
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<LayoutTemplateIcon />}
        title="Create your first Layout"
        description="A Layout is the Header and Footer that wrap your Pages."
        action={
          <Link href={NEW_LAYOUT_HREF} className={buttonVariants()}>
            <PlusIcon aria-hidden="true" /> New Layout
          </Link>
        }
      />
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <table className="w-full text-sm">
        <caption className="sr-only">Layouts</caption>
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Name
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Paths
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Used by
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
            <LayoutTableRow key={row.id} row={row} duplicate={duplicate} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LayoutTableRow({
  row,
  duplicate,
}: {
  row: LayoutRow
  duplicate: (formData: FormData) => void | Promise<void>
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <th scope="row" className="px-4 py-3 text-left font-medium">
        <Link href={`/admin/layouts/${row.id}`} className="hover:underline">
          {row.name}
        </Link>
      </th>
      <td className="px-4 py-3 font-mono text-xs">
        {row.paths.length === 0 ? (
          <span className="font-sans text-muted-foreground">No paths</span>
        ) : (
          row.paths.join(", ")
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {usedByLabel(row.usedByPages)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
        <UpdatedAt iso={row.updatedAt} />
      </td>
      <td className="px-4 py-3 text-right">
        <form action={duplicate}>
          <input type="hidden" name="id" value={row.id} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            aria-label={`Duplicate ${row.name}`}
          >
            <CopyIcon aria-hidden="true" /> Duplicate
          </Button>
        </form>
      </td>
    </tr>
  )
}
