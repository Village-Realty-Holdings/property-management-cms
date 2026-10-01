"use client"

import { useState } from "react"
import { Trash2Icon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"

import { deleteMedia } from "../actions/media"
import {
  ConfirmDialog,
  notify,
  summarizeDependents,
  type Dependent,
} from "../kit"

/**
 * The delete button on a Media card. An image nothing uses asks first. An
 * image in use can't be deleted (the same way a Font in use can't): the
 * dialog names every place that shows it, each linking to where to change it
 * (see loadMediaDependents), and the Server Action refuses too.
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
  const inUse = dependents.length > 0
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
      {inUse ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{`Image “${filename}” is in use`}</AlertDialogTitle>
              <AlertDialogDescription>
                It can&apos;t be deleted while anything shows it. Open each
                place below, change or remove the image there, then delete it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="text-sm">
              <p className="font-medium">{summarizeDependents(dependents)}</p>
              <ul className="mt-2 flex max-h-64 list-disc flex-col gap-1 overflow-y-auto pl-5">
                {dependents.map((d, i) => (
                  <li key={`${d.kind}-${d.name}-${i}`}>
                    {d.href ? (
                      <a
                        href={d.href}
                        className="underline underline-offset-3 hover:text-foreground"
                      >
                        {d.kind}: {d.name}
                      </a>
                    ) : (
                      <span>
                        {d.kind}: {d.name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={`Delete image “${filename}”?`}
          description="This cannot be undone."
          dependents={dependents}
          confirmLabel="Delete image"
          onConfirm={async () => {
            const result = await deleteMedia(id)
            if (result.ok) notify.success(result.message || "Deleted")
            return result
          }}
        />
      )}
    </>
  )
}
