import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"

import { PagesSearch, PagesTable } from "@/admin/dashboard/PagesTable"
import { loadPageRows } from "@/admin/dashboard/queries"
import { PageHeader, TableSkeleton } from "@/admin/kit"
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
          // The Visual Editor takes over New Page in Phase 5.
          <Link href="/admin/pages/new" className={buttonVariants()}>
            <PlusIcon aria-hidden="true" /> New Page
          </Link>
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

async function Rows({ query }: { query: string }) {
  const { payload, as } = await requireStaff()
  const rows = await loadPageRows(payload, as, { q: query })
  return <PagesTable rows={rows} query={query} />
}
