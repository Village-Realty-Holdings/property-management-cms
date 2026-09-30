import type { Metadata } from "next"

import { ThemeCard } from "@/admin/dashboard/cards"
import { PageHeader } from "@/admin/kit"

export const metadata: Metadata = { title: "Theme" }

/**
 * Placeholder for the Theme editor, which arrives with the Visual Editor
 * (Phase 5) on top of the Theme record (Phase 2).
 */
export default function ThemePlaceholder() {
  return (
    <>
      <PageHeader
        title="Theme"
        description="The colours, fonts and shape of your whole Site."
      />
      <div className="grid max-w-xl gap-4">
        <p className="rounded-xl border bg-background p-5 text-sm text-muted-foreground">
          The Theme editor is coming. Until then your Site uses the default
          palette below, and every Page shares it.
        </p>
        <ThemeCard />
      </div>
    </>
  )
}
