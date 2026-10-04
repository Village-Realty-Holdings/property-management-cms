import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"

import { AddStarterTemplatesButton } from "@/admin/components/pageTemplates/AddStarterTemplatesButton"
import { PageTemplatesTable } from "@/admin/components/pageTemplates/PageTemplatesTable"
import { PageHeader, TableSkeleton } from "@/admin/kit"
import { loadPageTemplateRows, startersMissing } from "@/admin/pageTemplates"
import { requireUser } from "@/admin/session"

export const metadata: Metadata = { title: "Page Templates" }

/** The Page Templates: the Pages that new Pages can start from. */
export default function PageTemplatesList() {
  return (
    <>
      <PageHeader
        title="Page Templates"
        description="Pages that new Pages can start from. A Page made from one is its own copy."
        action={
          <Link
            href="/admin/pages"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeftIcon aria-hidden="true" /> Pages
          </Link>
        }
      />
      <Suspense
        fallback={<TableSkeleton columns={4} label="Loading Page Templates" />}
      >
        <Rows />
      </Suspense>
    </>
  )
}

async function Rows() {
  const { payload, as } = await requireUser()
  const [rows, missing] = await Promise.all([
    loadPageTemplateRows(payload, as),
    startersMissing(payload, as),
  ])
  return (
    <div className="flex flex-col gap-4">
      <PageTemplatesTable
        rows={rows}
        emptyAction={
          missing ? <AddStarterTemplatesButton variant="default" /> : undefined
        }
      />
      {missing && rows.length > 0 && (
        <div className="flex justify-end">
          <AddStarterTemplatesButton />
        </div>
      )}
    </div>
  )
}
