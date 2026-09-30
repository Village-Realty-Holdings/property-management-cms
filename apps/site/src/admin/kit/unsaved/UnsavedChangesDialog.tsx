"use client"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"

import { InlineError } from "../InlineError"
import type { UnsavedChangesDialogState } from "./useUnsavedChangesGuard"

/**
 * The Save / Discard / Stay dialog. Focus is trapped inside while it is open
 * and returns to where it was on close; Escape means Stay. Stay comes first in
 * the tab order, as the safe choice.
 */
export function UnsavedChangesDialog({
  open,
  saving,
  error,
  onSave,
  onDiscard,
  onStay,
}: UnsavedChangesDialogState) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onStay()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            Save them before you leave, discard them, or stay on this page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <InlineError>{error}</InlineError>}
        <AlertDialogFooter>
          <Button variant="outline" disabled={saving} onClick={onStay}>
            Stay
          </Button>
          <Button variant="destructive" disabled={saving} onClick={onDiscard}>
            Discard changes
          </Button>
          <Button disabled={saving} onClick={onSave}>
            {saving ? "Saving…" : error ? "Try again" : "Save"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
