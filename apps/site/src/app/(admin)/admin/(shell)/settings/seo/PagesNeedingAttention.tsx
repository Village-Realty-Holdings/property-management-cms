import Link from "next/link"
import { CircleCheckIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"

import { Section } from "@/admin/components/FormBits"
import { EmptyState } from "@/admin/kit"
import type { SeoAttention } from "@/admin/seoHealth"

const missingLabel: Record<SeoAttention["missing"][number], string> = {
  title: "SEO title",
  description: "SEO description",
}

/** Where a row goes: the Page, with its Page tab (title, path, SEO) open. */
export const pageSeoHref = (id: number) => `/admin/pages/${id}?tab=page`

/**
 * Published Pages with no SEO title or description of their own, each
 * linking to the Page so the text can be added.
 */
export function PagesNeedingAttention({ rows }: { rows: SeoAttention[] }) {
  return (
    <Section
      title="Pages needing attention"
      description="Published Pages without their own SEO title or description. Search engines may show something less useful for them."
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<CircleCheckIcon />}
          title="Every published Page has a title and description"
          description="Nothing to fix. New Pages that are published without them will show up here."
          action={
            <Link
              href="/admin/pages"
              className={buttonVariants({ variant: "outline" })}
            >
              View Pages
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Published Pages missing an SEO title or description
            </caption>
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Page
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Path
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Missing
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
                      href={pageSeoHref(row.id)}
                      className="hover:underline"
                    >
                      {row.title}
                    </Link>
                  </th>
                  <td className="px-4 py-3 font-mono text-xs">{row.path}</td>
                  <td className="px-4 py-3">
                    {row.missing.map((m) => missingLabel[m]).join(" and ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}
