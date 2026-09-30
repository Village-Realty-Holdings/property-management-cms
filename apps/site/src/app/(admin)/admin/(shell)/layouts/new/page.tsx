import type { Metadata } from "next"
import Link from "next/link"

import { buttonVariants } from "@workspace/ui/components/button"

import { EmptyState, PageHeader } from "@/admin/kit"

export const metadata: Metadata = { title: "New Layout" }

/** Placeholder until Layouts exist (Phase 3) and are edited in the Visual Editor (Phase 5). */
export default function NewLayout() {
  return (
    <>
      <PageHeader
        title="New Layout"
        description="A Layout is the Header and Footer that wrap your Pages."
      />
      <EmptyState
        title="Layouts are coming"
        description="You will build Layouts here, in the Visual Editor. Until then, Pages render without a Layout."
        action={
          <Link href="/admin/layouts" className={buttonVariants()}>
            Back to Layouts
          </Link>
        }
      />
    </>
  )
}
