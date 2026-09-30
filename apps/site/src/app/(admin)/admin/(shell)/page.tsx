import { Suspense } from "react"
import type { Metadata } from "next"

import {
  ContinueEditingCard,
  QuickActionsCard,
  SeoHealthCard,
  SiteSummaryCard,
  ThemeCard,
  WaitingToPublishCard,
} from "@/admin/dashboard/cards"
import { getSiteCard } from "@/admin/dashboard/getSiteCard"
import { loadDashboard } from "@/admin/dashboard/queries"
import { CardSkeleton, PageHeader } from "@/admin/kit"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Dashboard" }

/** The Admin's home: the Site at a glance and the way into recent work. */
export default async function Dashboard() {
  const site = await getSiteCard()
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${site.name} at a glance, and the way back into your work.`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <SiteSummaryCard site={site} />
        <QuickActionsCard />
        <Suspense
          fallback={[
            "Loading recent work",
            "Loading Pages waiting to publish",
            "Loading SEO health",
          ].map((label) => (
            <CardSkeleton key={label} label={label} />
          ))}
        >
          <ContentCards />
        </Suspense>
        <ThemeCard />
      </div>
    </>
  )
}

/** The cards that read Pages; they stream in after the rest. */
async function ContentCards() {
  const { payload, as } = await requireStaff()
  const data = await loadDashboard(payload, as)
  return (
    <>
      <ContinueEditingCard items={data.continueEditing} />
      <WaitingToPublishCard rows={data.waiting} />
      <SeoHealthCard count={data.seoAttentionCount} />
    </>
  )
}
