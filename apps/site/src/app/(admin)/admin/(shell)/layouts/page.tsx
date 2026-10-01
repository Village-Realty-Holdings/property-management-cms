import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"

import { LayoutsTable } from "@/admin/dashboard/LayoutsTable"
import { loadLayoutRows } from "@/admin/dashboard/queries"
import { NEW_LAYOUT_HREF } from "@/admin/dashboard/rows"
import { PageHeader, TableSkeleton } from "@/admin/kit"
import { requireStaff } from "@/admin/session"

import { deleteLayout, duplicateLayout } from "./actions"

export const metadata: Metadata = { title: "Layouts" }

/** The Layouts: the Header and Footer that wrap Pages, and where they apply. */
export default function LayoutsList() {
  return (
    <>
      <PageHeader
        title="Layouts"
        description="The Header and Footer that wrap your Pages."
        action={
          <Link href={NEW_LAYOUT_HREF} className={buttonVariants()}>
            <PlusIcon aria-hidden="true" /> New Layout
          </Link>
        }
      />
      <Suspense
        fallback={<TableSkeleton columns={5} label="Loading Layouts" />}
      >
        <Rows />
      </Suspense>
    </>
  )
}

async function Rows() {
  const { payload, as } = await requireStaff()
  const rows = await loadLayoutRows(payload, as)
  return (
    <LayoutsTable
      rows={rows}
      duplicate={duplicateLayout}
      remove={deleteLayout}
    />
  )
}
