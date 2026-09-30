"use client"

import { useState } from "react"

import { Button } from "@workspace/ui/components/button"

import { deletePage } from "../actions/pages"
import { ConfirmDialog, notify, type Dependent } from "../kit"

/**
 * Deletes a Page, after asking. The dialog says whether the Page is live on
 * the Site and names the Pages whose buttons link to it, because deleting a
 * Page leaves those links pointing nowhere.
 */
export function DeletePageButton({
  id,
  title,
  path,
  published,
  dependents,
  onDeleted,
}: {
  id: number
  title: string
  path: string
  /** Visitors can see the Page today. */
  published: boolean
  /** The Pages that link to this one; empty when none do. */
  dependents: readonly Dependent[]
  /** The Page is gone: the editor takes the user back to the list. */
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        Delete Page
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete Page “${title}”?`}
        description={
          published
            ? `It is live on the Site at ${path}: visitors will get “not found” there. Its Draft and history are deleted too, and this cannot be undone.`
            : "Its Draft and history are deleted with it. This cannot be undone."
        }
        dependents={dependents}
        confirmLabel="Delete Page"
        onConfirm={async () => {
          const result = await deletePage(id)
          if (result.ok) {
            notify.success(result.message || "Deleted")
            onDeleted()
          }
          return result
        }}
      />
    </>
  )
}
