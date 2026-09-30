import Link from "next/link"
import { LayoutTemplateIcon, PlusIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"

import type { FormState } from "../formState"
import { EmptyState } from "../kit/EmptyState"
import { LayoutRowActions } from "./LayoutRowActions"
import { NEW_LAYOUT_HREF, type LayoutRow } from "./rows"
import { UpdatedAt } from "./UpdatedAt"

/** "used by 3 Pages", "used by 1 Page", "not used by any Page". */
export function usedByLabel(count: number): string {
  if (count === 0) return "Not used by any Page"
  return `Used by ${count} ${count === 1 ? "Page" : "Pages"}`
}

/**
 * The Layouts list: name, paths, how many Pages use it, last updated, and
 * Duplicate and Delete. `duplicate` and `remove` are Server Actions taking a
 * Layout's id (see layouts/actions.ts).
 */
export function LayoutsTable({
  rows,
  duplicate,
  remove,
}: {
  rows: LayoutRow[]
  duplicate: (id: number) => Promise<FormState>
  remove: (id: number) => Promise<FormState>
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
            <LayoutTableRow
              key={row.id}
              row={row}
              duplicate={duplicate}
              remove={remove}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LayoutTableRow({
  row,
  duplicate,
  remove,
}: {
  row: LayoutRow
  duplicate: (id: number) => Promise<FormState>
  remove: (id: number) => Promise<FormState>
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <th scope="row" className="px-4 py-3 text-left font-medium">
        <Link href={`/admin/layouts/${row.id}`} className="hover:underline">
          {row.name}
        </Link>
      </th>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {row.isDefault && (
            <Badge variant="secondary" title="Pages nothing else covers use it">
              Default
            </Badge>
          )}
          {row.paths.length === 0 ? (
            <span className="text-muted-foreground">No paths</span>
          ) : (
            <span className="font-mono text-xs">{row.paths.join(", ")}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {usedByLabel(row.usedByPages)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
        <UpdatedAt iso={row.updatedAt} />
      </td>
      <td className="px-4 py-3 text-right">
        <LayoutRowActions row={row} duplicate={duplicate} remove={remove} />
      </td>
    </tr>
  )
}
