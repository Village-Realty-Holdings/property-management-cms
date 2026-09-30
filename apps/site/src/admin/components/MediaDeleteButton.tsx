"use client"

import { useState } from "react"
import { Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { deleteMedia } from "../actions/media"
import { ConfirmDialog, notify } from "../kit"

/**
 * The delete button on a Media card. It asks first: deleting an image removes
 * it from anything that uses it. Who uses it is not looked up yet, so the
 * dialog says so generally instead of naming Pages.
 */
export function MediaDeleteButton({
  id,
  filename,
}: {
  id: number
  filename: string
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
        title="Delete this image?"
        description="Anything using it will lose it."
        showDependents={false}
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
