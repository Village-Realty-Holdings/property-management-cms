"use client"

import { useState } from "react"
import { Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { deleteMedia } from "../actions/media"
import { ConfirmDialog, notify, type Dependent } from "../kit"

/**
 * The delete button on a Media card. It asks first, and names what uses the
 * image (the Brand, SEO and Pages; see loadMediaDependents), because deleting
 * an image empties it everywhere it is used.
 */
export function MediaDeleteButton({
  id,
  filename,
  dependents,
}: {
  id: number
  filename: string
  /** Everything that shows this image; empty when nothing does. */
  dependents: readonly Dependent[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${filename}`}
        onClick={() => setOpen(true)}
      >
        <Trash2Icon />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete image “${filename}”?`}
        description="This cannot be undone. Where the image is used, it will be empty."
        dependents={dependents}
        confirmLabel="Delete image"
        onConfirm={async () => {
          const result = await deleteMedia(id)
          if (result.ok) notify.success(result.message || "Deleted")
          return result
        }}
      />
    </>
  )
}
