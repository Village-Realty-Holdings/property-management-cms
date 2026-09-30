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

import { summarizeDependents, type Dependent } from "./dependents"
import { InlineError } from "./InlineError"

/** How many dependents are listed by name before "and N more". */
const MAX_LISTED = 10

const FAILED = "Something went wrong. Please try again."

/**
 * Confirmation for a destructive action. It names what depends on the item, so
 * the user knows the cost before saying yes. If the action fails the dialog
 * stays open with the error shown inline.
 *
 *   <ConfirmDialog
 *     open={target !== null}
 *     onOpenChange={(open) => !open && setTarget(null)}
 *     title={`Delete Layout “${target.name}”?`}
 *     description="This cannot be undone."
 *     dependents={target.pages.map((p) => ({ kind: "Page", name: p.title }))}
 *     confirmLabel="Delete Layout"
 *     onConfirm={() => deleteLayout(target.id)}
 *   />
 *
 * `onConfirm` may resolve with a FormState-like `{ ok: false, message }` or
 * throw to report a failure. Anything else closes the dialog.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  dependents = [],
  showDependents = true,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Everything that depends on the item; empty when nothing does. */
  dependents?: readonly Dependent[]
  /**
   * Whether to say who uses the item. Pass false when the screen cannot look
   * that up (yet): an empty list would then wrongly read "Nothing else uses it".
   */
  showDependents?: boolean
  /** Names the action, e.g. "Delete Layout", not "OK". */
  confirmLabel: string
  cancelLabel?: string
  /**
   * How the confirm button looks. Destructive by default; pass "default" to
   * confirm something that changes a lot but loses nothing, such as
   * restoring an earlier Theme.
   */
  confirmVariant?: "destructive" | "default"
  onConfirm: () =>
    | void
    | { ok?: boolean; message?: string }
    | Promise<void | { ok?: boolean; message?: string }>
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  function close() {
    setError(undefined)
    onOpenChange(false)
  }

  async function confirm() {
    setPending(true)
    setError(undefined)
    try {
      const result = await onConfirm()
      if (result && result.ok === false) {
        setError(result.message || FAILED)
        return
      }
      close()
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : FAILED)
    } finally {
      setPending(false)
    }
  }

  const listed = dependents.slice(0, MAX_LISTED)
  const hidden = dependents.length - listed.length

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        if (next) onOpenChange(true)
        else close()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <div className="text-sm">
          {showDependents && (
            <p className="font-medium">{summarizeDependents(dependents)}</p>
          )}
          {showDependents && listed.length > 0 && (
            <ul className="mt-2 flex max-h-48 list-disc flex-col gap-1 overflow-y-auto pl-5 text-muted-foreground">
              {listed.map((d, i) => (
                <li key={`${d.kind}-${d.name}-${i}`}>
                  {d.kind}: {d.name}
                </li>
              ))}
              {hidden > 0 && <li className="list-none">and {hidden} more</li>}
            </ul>
          )}
        </div>
        {error && <InlineError>{error}</InlineError>}
        <AlertDialogFooter>
          <Button variant="outline" disabled={pending} onClick={close}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} disabled={pending} onClick={confirm}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
