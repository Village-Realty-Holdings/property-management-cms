"use client"

import { useState } from "react"
import { CircleAlertIcon, HistoryIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { restoreTheme } from "../actions/theme"
import { ConfirmDialog, notify } from "../kit"
import type { HistoryRow } from "../theme/themeScreen"

/** "The Heading font was deleted, so the Classic font is used instead." */
function deletedFontsNote(labels: readonly string[]): string {
  const many = labels.length > 1
  return `The ${labels.join(" and ")} ${many ? "were" : "was"} deleted, so the Classic ${many ? "fonts are" : "font is"} used instead.`
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
                <time dateTime={row.savedAt}>{row.when}</time>
                {row.author ? ` · ${row.author}` : ""}
              </p>
              {row.missingFonts.length > 0 && !row.isLive && (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <CircleAlertIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  <span>{deletedFontsNote(row.missingFonts)}</span>
                </p>
              )}
            </div>
            {row.isLive ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-foreground"
                />
                Live on your Site
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                aria-label={`Restore the version saved ${row.when}`}
                onClick={() => {
                  setTarget(row)
                  setOpen(true)
                }}
              >
                <HistoryIcon aria-hidden="true" />
                Restore
              </Button>
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
            ? `Your Site will look like it did on ${target.when}, straight away. It is saved as a new version, so nothing is lost.${
                target.missingFonts.length > 0
                  ? ` ${deletedFontsNote(target.missingFonts)}`
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
