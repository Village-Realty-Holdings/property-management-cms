"use client"

import { useState } from "react"
import { HistoryIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { ConfirmDialog } from "../../kit"
import type { LayoutVersionRow } from "../../layouts/layoutScreen"
import { LocalTime, useLocalMoment } from "../../time/LocalTime"
import { formatMoment } from "../../time/formatMoment"

/** Restore for one version; it names the version by when it was saved. */
function RestoreButton({
  row,
  onClick,
}: {
  row: LayoutVersionRow
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
 * The Layout's version history, newest first: when each save was made, who
 * made it and what it changed. The newest is the one on the Site ("Live");
 * every other version has a Restore button. Restoring asks first, because it
 * changes every Page that uses the Layout at once. It is saved as a new
 * version, so nothing is lost.
 */
export function LayoutHistoryTab({
  rows,
  usedBy,
  dirty,
  onRestore,
}: {
  rows: readonly LayoutVersionRow[]
  /** How many Pages a restore reaches. */
  usedBy: number
  /** The open Layout has unsaved changes, which a restore replaces. */
  dirty: boolean
  /** Restores the version; resolve `{ ok: false, message }` to show why it failed. */
  onRestore: (
    row: LayoutVersionRow
  ) => Promise<void | { ok?: boolean; message?: string }>
}) {
  const [target, setTarget] = useState<LayoutVersionRow | null>(null)

  if (rows.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No versions yet. The first save is kept here.
      </p>
    )
  }

  const reach =
    usedBy === 0
      ? "No Pages use this Layout yet."
      : `It changes ${usedBy} ${usedBy === 1 ? "Page" : "Pages"} on your Site straight away.`

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">
        Every save goes live at once and is kept here. Restore an earlier
        version to put your Pages back the way they were.
      </p>
      <ol aria-label="Layout versions" className="flex flex-col divide-y">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-2 py-3 first:pt-0">
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.summary}</p>
              <p className="text-sm text-muted-foreground">
                <LocalTime iso={row.savedAt} withZone />
                {row.author ? ` · ${row.author}` : ""}
              </p>
            </div>
            {row.isLive ? (
              <p className="text-xs font-medium text-muted-foreground">
                Live on your Site
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
            ? `Your Layout goes back to how it was on ${formatMoment(target.savedAt, { withZone: true })}. ${reach} It is saved as a new version, so nothing is lost.${
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
