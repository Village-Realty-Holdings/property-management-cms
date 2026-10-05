import type { ReactNode } from "react"

import { AdminSidebar } from "@/admin/components/AdminSidebar"
import { getSiteCard } from "@/admin/dashboard/getSiteCard"
import { MAIN_CONTENT_ID } from "@/admin/kit"
import { requireUser } from "@/admin/session"
import { otherSitesFor } from "@/admin/users"

/**
 * The signed-in Admin: sidebar with navigation, the other Sites the User can
 * switch to, and the User.
 */
export default async function AdminShellLayout({
  children,
}: {
  children: ReactNode
}) {
  const [{ payload, user, as }, site] = await Promise.all([
    requireUser(),
    getSiteCard(),
  ])
  const otherSites = await otherSitesFor(payload, as)
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <AdminSidebar
        site={site}
        user={user}
        otherSites={otherSites.map(({ id, name, schema }) => ({
          id,
          name: name || schema,
        }))}
      />
      <main id={MAIN_CONTENT_ID} className="min-w-0 flex-1 p-4 sm:p-8">
        {children}
      </main>
    </div>
  )
}
