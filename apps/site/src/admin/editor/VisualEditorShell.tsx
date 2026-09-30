"use client"

import type { ReactNode } from "react"

import {
  MAIN_CONTENT_ID,
  UnsavedChangesDialog,
  useUnsavedChangesGuard,
  type SaveResult,
} from "../kit"
import { CanvasFrame } from "./CanvasFrame"
import { useEditor } from "./EditorProvider"
import { LeftPanel, type PanelTab } from "./LeftPanel"
import type { PickerPage } from "./PagePicker"
import { TopBar, type EditorMode } from "./TopBar"

const BACK_HREF: Record<EditorMode, string> = {
  page: "/admin/pages",
  layout: "/admin/layouts",
  theme: "/admin",
}

const NOT_SAVABLE: SaveResult = {
  ok: false,
  message: "This document cannot be saved from here. Discard or stay.",
}

/**
 * The Visual Editor's frame: a dark top bar, the panel docked on the left and
 * the canvas beside it, full screen. It renders inside an `<EditorProvider>`,
 * and each mode (Page, Layout, Theme) fills in what differs:
 *
 *  - `actions`: Save, and Publish for a Page, for the top bar;
 *  - `tabs`: the panel's tabs and what is in them;
 *  - `canvasSrc`: the real Site route the canvas shows, in its editing mode;
 *  - `onSave`: what "Save" in the unsaved-changes dialog does (the same save
 *    as the top bar's button);
 *  - `onPickPage`: what choosing a Page in the Ctrl-K picker does. By default
 *    the Page opens in the Visual Editor, through the unsaved-changes guard.
 *
 * Leaving while `useEditor().isDirty` asks first (the Phase 1 guard), and
 * closing the tab shows the browser's warning.
 */
export function VisualEditorShell({
  mode,
  name,
  usedBy,
  goesLiveOn,
  backHref = BACK_HREF[mode],
  actions,
  tabs,
  tab,
  onTabChange,
  canvasSrc,
  onSave,
  onPickPage,
}: {
  mode: EditorMode
  /** The document's name: the Page's title, the Layout's name, "Theme". */
  name: string
  /** Layout mode: how many Pages use the Layout ("Used by N Pages"). */
  usedBy?: number
  /** Layout and Theme modes: how many Pages a save reaches. */
  goesLiveOn?: number
  backHref?: string
  actions?: ReactNode
  tabs: readonly PanelTab[]
  /** Controls which tab is open; omit to let the panel keep its own. */
  tab?: string
  onTabChange?: (id: string) => void
  canvasSrc: string
  onSave?: () => SaveResult | Promise<SaveResult>
  onPickPage?: (page: PickerPage) => void
}) {
  const { isDirty, discard } = useEditor()
  const { dialog, router } = useUnsavedChangesGuard({
    dirty: isDirty,
    onSave: onSave ?? (() => NOT_SAVABLE),
    onDiscard: discard,
  })
  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
      <TopBar
        mode={mode}
        name={name}
        usedBy={usedBy}
        goesLiveOn={goesLiveOn}
        backHref={backHref}
        actions={actions}
        onPickPage={
          onPickPage ?? ((page) => router.push(`/admin/pages/${page.id}`))
        }
      />
      <div className="flex min-h-0 flex-1">
        <LeftPanel tabs={tabs} tab={tab} onTabChange={onTabChange} />
        <main
          id={MAIN_CONTENT_ID}
          aria-label="Canvas"
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <CanvasFrame src={canvasSrc} title={`${name} as visitors see it`} />
        </main>
      </div>
      <UnsavedChangesDialog {...dialog} />
    </div>
  )
}
