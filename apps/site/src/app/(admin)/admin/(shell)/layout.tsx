import type { ReactNode } from "react"

import { AdminSidebar } from "@/admin/components/AdminSidebar"
import { getSiteCard } from "@/admin/dashboard/getSiteCard"
import { MAIN_CONTENT_ID } from "@/admin/kit"
import { requireUser } from "@/admin/session"

/** The signed-in Admin: sidebar with navigation and the User. */
export default async function AdminShellLayout({
  children,
}: {
  children: ReactNode
}) {
  const [{ user }, site] = await Promise.all([requireUser(), getSiteCard()])
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <AdminSidebar site={site} user={user} />
      <main id={MAIN_CONTENT_ID} className="min-w-0 flex-1 p-4 sm:p-8">
        {children}
      </main>
    </div>
  )
}
