"use client"

import { useState } from "react"
import { HistoryIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { ConfirmDialog } from "../../kit"
import type { PageVersionRow } from "../../pageHistory"
import { LocalTime, useLocalMoment } from "../../time/LocalTime"
import { formatMoment } from "../../time/formatMoment"

/** Restore for one version; it names the version by when it was saved. */
function RestoreButton({
  row,
  onClick,
}: {
  row: PageVersionRow
  onClick: () => void
}) {
  const saved = useLocalMoment(row.savedAt, { withZone: true })
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="self-start"
      aria-label={`Restore the version saved ${saved}`}
      onClick={onClick}
    >
      <HistoryIcon aria-hidden />
      Restore
    </Button>
  )
}

/**
 * The Page's version history, newest first: when each save was made, who made
 * it and whether it was a Draft or a publish. The newest is the one the editor
 * opened on; every other version has a Restore button. Restoring asks first,
 * because it replaces the Draft. It is saved as a new Draft, so nothing is
 * lost and nothing goes live until the User publishes.
 */
export function PageHistoryTab({
  rows,
  dirty,
  onRestore,
}: {
  rows: readonly PageVersionRow[]
  /** The open Page has unsaved changes, which a restore replaces. */
  dirty: boolean
  /** Restores the version; resolve `{ ok: false, message }` to show why it failed. */
  onRestore: (
    row: PageVersionRow
  ) => Promise<void | { ok?: boolean; message?: string }>
}) {
  const [target, setTarget] = useState<PageVersionRow | null>(null)

  if (rows.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No versions yet. The first save is kept here.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">
        Every save is kept here. Restore an earlier version to bring it back as
        a Draft; it goes on the Site only when you publish.
      </p>
      <ol aria-label="Page versions" className="flex flex-col divide-y">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-2 py-3 first:pt-0">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  <LocalTime iso={row.savedAt} withZone />
                </p>
                <p className="text-sm text-muted-foreground">
                  {row.author ?? "Unknown"}
                </p>
              </div>
              <Badge variant="outline">
                {row.status === "published" ? "Published" : "Draft"}
              </Badge>
            </div>
            {row.isLatest ? (
              <p className="text-xs font-medium text-muted-foreground">
                Latest version
              </p>
            ) : (
              <RestoreButton row={row} onClick={() => setTarget(row)} />
            )}
          </li>
        ))}
      </ol>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Restore this version?"
        description={
          target
            ? `Your Draft goes back to how this Page was on ${formatMoment(target.savedAt, { withZone: true })}. It is saved as a new Draft, so nothing is lost, and what visitors see does not change until you publish.${
                dirty ? " Your unsaved changes here are discarded." : ""
              }`
            : undefined
        }
        showDependents={false}
        confirmLabel="Restore version"
        confirmVariant="default"
        onConfirm={() => (target ? onRestore(target) : undefined)}
      />
    </div>
  )
}
