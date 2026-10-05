"use client"

import { useState } from "react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"

import {
  staleSaveDescription,
  staleSaveTitle,
  type SaveConflict,
} from "../staleSave"
import { formatMoment } from "../time/formatMoment"
import { InlineError } from "./InlineError"

const FAILED = "Something went wrong. Please try again."

export type StaleSaveDialogProps = {
  /** The dialog is open when this is set. */
  conflict: SaveConflict | null
  /** Throw away the unsaved changes and load what is stored. */
  onReload: () => void
  /** Save again over the newer version; `{ ok: false }` keeps the dialog open. */
  onSaveAnyway: () => Promise<void | { ok?: boolean; message?: string }>
  /** Escape or the close button: keep editing. */
  onClose: () => void
}

/**
 * "This Page changed since you opened it": shown when a save is refused
 * because someone saved first. Reload comes first in the tab order, as the
 * safe choice; Escape means keep editing. Brand and SEO keep no history, so
 * Save anyway is destructive there.
 */
export function StaleSaveDialog({
  conflict,
  onReload,
  onSaveAnyway,
  onClose,
}: StaleSaveDialogProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  // The text stays while the dialog fades out.
  const [shown, setShown] = useState(conflict)
  if (conflict && conflict !== shown) setShown(conflict)
  const kept = conflict ?? shown

  function close() {
    setError(undefined)
    onClose()
  }

  async function saveAnyway() {
    setPending(true)
    setError(undefined)
    try {
      const result = await onSaveAnyway()
      if (result && result.ok === false) setError(result.message || FAILED)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : FAILED)
    } finally {
      setPending(false)
    }
  }

  const keepsNothing = kept?.kind === "brand" || kept?.kind === "seo"

  return (
    <AlertDialog
      open={conflict !== null}
      onOpenChange={(next) => {
        if (!next && !pending) close()
      }}
    >
      <AlertDialogContent>
        {kept && (
          <AlertDialogHeader>
            <AlertDialogTitle>{staleSaveTitle(kept.kind)}</AlertDialogTitle>
            <AlertDialogDescription>
              {staleSaveDescription(
                kept,
                formatMoment(kept.at, { withZone: true })
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
        )}
        {error && <InlineError>{error}</InlineError>}
        <AlertDialogFooter>
          <Button variant="outline" disabled={pending} onClick={onReload}>
            Reload
          </Button>
          <Button
            variant={keepsNothing ? "destructive" : "default"}
            disabled={pending}
            onClick={saveAnyway}
          >
            {pending ? "Saving…" : "Save anyway"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
