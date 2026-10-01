"use client"

import { useState } from "react"
import { CircleAlertIcon, HistoryIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { restoreTheme } from "../actions/theme"
import { ConfirmDialog, notify } from "../kit"
import { LocalTime, useLocalMoment } from "../time/LocalTime"
import { formatMoment } from "../time/formatMoment"
import type { HistoryRow } from "../theme/themeScreen"

/** The label of Restore on the live version, which is also why it is off. */
const LIVE_VERSION_LABEL = "That version is already live."

/**
 * What restoring will change about fonts, said before it does:
 * "The Heading font was deleted, so the Classic font (Newsreader) will be used
 * instead."
 */
function substitutionNote(substitutions: HistoryRow["substitutions"]): string {
  const many = substitutions.length > 1
  const labels = substitutions.map((s) => s.label).join(" and ")
  const families = substitutions.map((s) => s.family).join(" and ")
  return `The ${labels} ${many ? "were" : "was"} deleted, so the Classic ${many ? "fonts" : "font"} (${families}) will be used instead.`
}

/** Restore for one version; it names the version by when it was saved. */
function RestoreButton({
  row,
  onClick,
}: {
  row: HistoryRow
  onClick: () => void
}) {
  const saved = useLocalMoment(row.savedAt, { withZone: true })
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      aria-label={`Restore the version saved ${saved}`}
      onClick={onClick}
    >
      <HistoryIcon aria-hidden="true" />
      Restore
    </Button>
  )
}

/**
 * The Theme's version history, newest first, with a Restore button on every
 * version but the live one. Restoring asks first, because it changes how the
 * whole Site looks at once; it is saved as a new version, so nothing is lost.
 */
export function ThemeHistory({ rows }: { rows: readonly HistoryRow[] }) {
  const [target, setTarget] = useState<HistoryRow | null>(null)
  const [open, setOpen] = useState(false)

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No versions yet. Your Site uses the default look until the Theme is
        saved for the first time.
      </p>
    )
  }

  return (
    <>
      <ol aria-label="Theme versions" className="flex flex-col divide-y">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.summary}</p>
              <p className="text-sm text-muted-foreground">
                <LocalTime iso={row.savedAt} withZone />
                {row.author ? ` · ${row.author}` : ""}
              </p>
              {row.substitutions.length > 0 && !row.isLive && (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <CircleAlertIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  <span>{substitutionNote(row.substitutions)}</span>
                </p>
              )}
            </div>
            {row.isLive ? (
              // Restoring the live version would change nothing, so the
              // action is off and says why.
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled
              >
                <HistoryIcon aria-hidden="true" />
                {LIVE_VERSION_LABEL}
              </Button>
            ) : (
              <RestoreButton
                row={row}
                onClick={() => {
                  setTarget(row)
                  setOpen(true)
                }}
              />
            )}
          </li>
        ))}
      </ol>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Restore this version?"
        description={
          target
            ? `Your Site will look like it did on ${formatMoment(target.savedAt, { withZone: true })}, straight away. It is saved as a new version, so nothing is lost.${
                target.substitutions.length > 0
                  ? ` ${substitutionNote(target.substitutions)}`
                  : ""
              }`
            : undefined
        }
        showDependents={false}
        confirmLabel="Restore version"
        confirmVariant="default"
        onConfirm={async () => {
          if (!target) return
          const result = await restoreTheme(target.id)
          if (result.ok) notify.success(result.message || "Theme restored")
          return result
        }}
      />
    </>
  )
}
