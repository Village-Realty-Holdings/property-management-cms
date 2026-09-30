"use client"

import { useState } from "react"
import { CopyIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import type { FormState } from "../formState"
import { ConfirmDialog, InlineError, notify } from "../kit"
import type { LayoutRow } from "./rows"

/** What a Layout's Delete dialog says before anything is deleted. */
export function deleteDescription(
  row: Pick<LayoutRow, "isDefault" | "usedByPages" | "dependents">
): string {
  if (row.isDefault) {
    return "This is the default Layout, so it can't be deleted. Make another Layout the default first."
  }
  if (row.dependents.length > 0) {
    return "Pages pick this Layout by name, so it can't be deleted. Give them another Layout first."
  }
  const base =
    "Its history and paths are deleted with it, and this cannot be undone."
  if (row.usedByPages > 0) {
    return `${base} Layouts go live on save, so the Pages that reach it by path move to the next Layout that covers them, or the default, on the live Site at once.`
  }
  return `${base} Pages that reach it by path use the next Layout that covers them, or the default.`
}

/**
 * The Pages the Delete dialog names: the ones that pick the Layout (they
 * block the delete), otherwise every Page that reaches it by path.
 */
export function deleteDependents(
  row: Pick<LayoutRow, "dependents" | "pages">
): LayoutRow["dependents"] {
  return row.dependents.length > 0 ? row.dependents : row.pages
}

/**
 * Duplicate and Delete for one row of the Layouts list. `duplicate` and
 * `remove` are Server Actions taking the Layout's id. Duplicate confirms with
 * a toast; a failure shows inline. Delete asks first, says what depends on
 * the Layout and why a default or picked Layout can't go.
 */
export function LayoutRowActions({
  row,
  duplicate,
  remove,
}: {
  row: LayoutRow
  duplicate: (id: number) => Promise<FormState>
  remove: (id: number) => Promise<FormState>
}) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function copy() {
    setPending(true)
    setError(undefined)
    try {
      const result = await duplicate(row.id)
      if (result.ok) notify.success(result.message || "Duplicated")
      else setError(result.message || "Something went wrong. Please try again.")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setPending(false)
    }
  }

  const shown = deleteDependents(row)

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          aria-label={`Duplicate ${row.name}`}
          onClick={copy}
        >
          <CopyIcon aria-hidden="true" /> Duplicate
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Delete ${row.name}`}
          onClick={() => setConfirming(true)}
        >
          <Trash2Icon aria-hidden="true" /> Delete
        </Button>
      </div>
      {error && <InlineError>{error}</InlineError>}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete Layout “${row.name}”?`}
        description={deleteDescription(row)}
        dependents={shown}
        // "Nothing else uses it" is only true of a Layout no Page resolves
        // to; never say it beside "Used by N Pages".
        showDependents={
          !row.isDefault && (shown.length > 0 || row.usedByPages === 0)
        }
        confirmLabel="Delete Layout"
        onConfirm={async () => {
          const result = await remove(row.id)
          if (result.ok) notify.success(result.message || "Deleted")
          return result
        }}
      />
    </div>
  )
}
