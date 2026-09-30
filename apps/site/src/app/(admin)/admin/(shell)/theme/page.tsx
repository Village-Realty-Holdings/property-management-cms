import type { Metadata } from "next"

import { ThemeHistory } from "@/admin/components/ThemeHistory"
import { DashboardCard } from "@/admin/dashboard/DashboardCard"
import { ThemeSwatches } from "@/admin/dashboard/cards"
import { themeStatusLine } from "@/admin/dashboard/site"
import { PageHeader } from "@/admin/kit"
import { requireStaff } from "@/admin/session"
import { loadThemeScreen } from "@/admin/theme/themeScreen"

export const metadata: Metadata = { title: "Theme" }

/**
 * The Theme, read-only, and its version history with Restore. The editor
 * arrives with the Visual Editor (Phase 5) on top of the Theme record.
 */
export default async function ThemePage() {
  const { payload, as } = await requireStaff()
  const screen = await loadThemeScreen(payload, as)
  return (
    <>
      <PageHeader
        title="Theme"
        description="The colours, fonts and shape of your whole Site."
      />
      <div className="grid max-w-3xl gap-4">
        <DashboardCard id="theme-current" title="Current Theme">
          <ThemeSwatches summary={screen.summary} />
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {screen.details.map((row) => (
              <div key={row.label} className="flex flex-col">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">
            {themeStatusLine(screen.summary)}. Editing the Theme arrives with
            the Visual Editor.
          </p>
        </DashboardCard>
        <DashboardCard id="theme-history" title="History">
          <p className="text-sm text-muted-foreground">
            Every save goes live on your Site at once and is kept here. Restore
            an earlier version to put your Site back the way it was.
          </p>
          <ThemeHistory rows={screen.history} />
        </DashboardCard>
      </div>
    </>
  )
}
