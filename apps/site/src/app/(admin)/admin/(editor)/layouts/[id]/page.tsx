import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  loadLayoutPreviewPage,
  restoreLayoutDocument,
  saveLayoutDocument,
} from "@/admin/actions/layouts"
import { LayoutMode } from "@/admin/editor/modes/LayoutMode"
import { loadLayoutScreen } from "@/admin/layouts/layoutScreen"
import { mediaOptions } from "@/admin/media"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Edit Layout" }

type Props = { params: Promise<{ id: string }> }

const actions = {
  save: saveLayoutDocument,
  restore: restoreLayoutDocument,
  loadPage: loadLayoutPreviewPage,
}

/**
 * A Layout in the Visual Editor's Layout mode: its Header and Footer on the
 * canvas around a Page that uses it, live on every such Page when saved
 * (apps/site ADR-0006).
 */
export default async function LayoutEditor({ params }: Props) {
  const { id } = await params
  const staff = await requireStaff()
  const screen = await loadLayoutScreen(staff.payload, staff.as, Number(id))
  if (!screen) notFound()
  return (
    <LayoutMode
      screen={screen}
      media={await mediaOptions(staff)}
      actions={actions}
    />
  )
}
