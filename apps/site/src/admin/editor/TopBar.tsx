"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Redo2, Trash2, Undo2 } from "lucide-react"

import { Button, buttonVariants } from "@workspace/ui/components/button"

import { ConfirmDialog } from "../kit"
import { useEditor } from "./EditorProvider"
import { PagePicker, type PickerPage } from "./PagePicker"
import { ShortcutsHelp } from "./ShortcutsHelp"

export type EditorMode = "page" | "layout" | "theme"

const MODE_LABEL: Record<EditorMode, string> = {
  page: "Page",
  layout: "Layout",
  theme: "Theme",
}

const pages = (n: number) => `${n} ${n === 1 ? "Page" : "Pages"}`

/**
 * The Visual Editor's top bar. Always dark, whatever the Theme: it carries the
 * `dark` palette, and its own focus ring comes from that palette's foreground.
 * `actions` holds Save (and Publish for a Page), which each mode supplies.
 */
export function TopBar({
  mode,
  name,
  usedBy,
  goesLiveOn,
  backHref,
  actions,
  onPickPage,
  pickerOpen,
  onPickerOpenChange,
}: {
  mode: EditorMode
  name: string
  usedBy?: number
  goesLiveOn?: number
  backHref: string
  actions?: ReactNode
  /** What choosing a Page in the Ctrl-K picker does; omit to open it. */
  onPickPage?: (page: PickerPage) => void
  /** Controls whether the Page picker is open (the shell's shortcuts open it). */
  pickerOpen?: boolean
  onPickerOpenChange?: (open: boolean) => void
}) {
  const { undo, redo, discard, canUndo, canRedo, isDirty } = useEditor()
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  return (
    <header className="dark flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 bg-background px-3 py-2 text-foreground [--btn-bg-hover:oklch(0.85_0_0)] [--btn-bg:oklch(0.922_0_0)] [--btn-fg-hover:oklch(0.205_0_0)] [--btn-fg:oklch(0.205_0_0)]">
      <Link
        href={backHref}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft aria-hidden />
        Back
      </Link>

      <h1 className="max-w-[24ch] min-w-0 truncate text-sm font-semibold">
        {name}
      </h1>
      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
        {MODE_LABEL[mode]}
      </span>
      {mode === "layout" && usedBy !== undefined && (
        <span className="text-xs text-muted-foreground">
          Used by {pages(usedBy)}
        </span>
      )}

      <PagePicker
        onPick={onPickPage}
        open={pickerOpen}
        onOpenChange={onPickerOpenChange}
      />

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ShortcutsHelp />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Undo"
          title="Undo"
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Redo"
          title="Redo"
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!isDirty}
          onClick={() => setConfirmingDiscard(true)}
        >
          <Trash2 aria-hidden />
          Discard
        </Button>
        {goesLiveOn !== undefined && (
          <span className="text-xs text-muted-foreground">
            Goes live on {pages(goesLiveOn)}
          </span>
        )}
        {actions}
      </div>

      <ConfirmDialog
        open={confirmingDiscard}
        onOpenChange={setConfirmingDiscard}
        title="Discard your changes?"
        description="Everything you changed since the last save is lost."
        showDependents={false}
        confirmLabel="Discard changes"
        cancelLabel="Cancel"
        onConfirm={discard}
      />
    </header>
  )
}
