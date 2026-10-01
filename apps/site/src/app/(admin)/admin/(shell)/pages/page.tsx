import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { LayoutPanelTopIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"

import { NewPageButton } from "@/admin/components/pageTemplates/NewPageButton"
import { PagesSearch, PagesTable } from "@/admin/dashboard/PagesTable"
import { loadPageRows } from "@/admin/dashboard/queries"
import { PageHeader, TableSkeleton } from "@/admin/kit"
import { loadPageTemplateRows } from "@/admin/pageTemplates"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Pages" }

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

/** Every Page, newest change first, with its path, status and Layout. */
export default async function PagesList({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { q } = await searchParams
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? ""
  return (
    <>
      <PageHeader
        title="Pages"
        description="Everything visitors can open on your Site."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/pages/templates"
              className={buttonVariants({ variant: "outline" })}
            >
              <LayoutPanelTopIcon aria-hidden="true" /> Page Templates
            </Link>
            <Suspense fallback={<NewPageButton templates={[]} />}>
              <NewPage />
            </Suspense>
          </div>
        }
      />
      <PagesSearch query={query} />
      <Suspense
        key={query}
        fallback={<TableSkeleton columns={5} label="Loading Pages" />}
      >
        <Rows query={query} />
      </Suspense>
    </>
  )
}

/** New Page, which offers the Page Templates when there are some. */
async function NewPage() {
  const { payload, as } = await requireStaff()
  return <NewPageButton templates={await loadPageTemplateRows(payload, as)} />
}

async function Rows({ query }: { query: string }) {
  const { payload, as } = await requireStaff()
  const rows = await loadPageRows(payload, as, { q: query })
  return <PagesTable rows={rows} query={query} />
}
