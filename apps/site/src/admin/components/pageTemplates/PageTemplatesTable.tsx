import Link from "next/link"
import { LayoutPanelTopIcon, PencilIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"

import { UpdatedAt } from "../../dashboard/UpdatedAt"
import { EmptyState } from "../../kit/EmptyState"
import type { PageTemplateRow } from "../../pageTemplates"
import { NewPageButton } from "./NewPageButton"
import { blocksSummary } from "./summary"

/**
 * The Page Templates list: each one's name and Blocks, with New Page (from
 * it) and Edit. A Page Template is a Page, so Edit opens it in the Visual
 * Editor, which is also where it is renamed, deleted or turned back into an
 * ordinary Page. `emptyAction` is what the empty list offers.
 */
export function PageTemplatesTable({
  rows,
  emptyAction,
}: {
  rows: PageTemplateRow[]
  emptyAction?: React.ReactNode
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<LayoutPanelTopIcon />}
        title="No Page Templates yet"
        description="A Page Template is a Page that new Pages can start from. Open a Page and turn on “Use as a Page Template” on its Page tab."
        action={
          emptyAction ?? (
            <Link href="/admin/pages" className={buttonVariants()}>
              Go to Pages
            </Link>
          )
        }
      />
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <table className="w-full text-sm">
        <caption className="sr-only">Page Templates</caption>
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Name
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Blocks
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
              className="border-b align-top last:border-0 hover:bg-muted/50"
            >
              <th scope="row" className="px-4 py-3 text-left font-medium">
                <Link
                  href={`/admin/pages/${row.id}`}
                  className="hover:underline"
                >
                  {row.name}
                </Link>
              </th>
              <td className="px-4 py-3 text-muted-foreground">
                {blocksSummary(row.blocks)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                <UpdatedAt iso={row.updatedAt} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <NewPageButton
                    templates={rows}
                    initialTemplateId={row.id}
                    ariaLabel={`New Page from ${row.name}`}
                    variant="ghost"
                    size="sm"
                  />
                  <Link
                    href={`/admin/pages/${row.id}?tab=page`}
                    aria-label={`Edit ${row.name}`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    <PencilIcon aria-hidden="true" /> Edit
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
