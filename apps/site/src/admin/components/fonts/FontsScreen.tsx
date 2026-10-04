"use client"

import { useState } from "react"
import { LockIcon, TrashIcon, TypeIcon, UploadIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { deleteFont } from "../../actions/fonts"
import {
  sampleCss,
  SAMPLE_TEXT,
  type BuiltInRow,
  type FontRow,
} from "../../fonts/rows"
import { ConfirmDialog, EmptyState, notify, PageHeader } from "../../kit"
import { formatMoment } from "../../time/formatMoment"
import { AddGoogleFontSheet } from "./AddGoogleFontSheet"
import { UploadFontsSheet } from "./UploadFontsSheet"

/**
 * Assets › Fonts: the Fonts Users added (Google Fonts or uploaded), each with
 * a sample line set in that Font, its weights, and a lock with what uses it
 * when it is in use; and the built-in fonts, read-only, below.
 *
 * `rows` and `builtIn` come from the page. `builtInClassName` is the class
 * that defines the built-in fonts' CSS variables (src/site/fonts.ts).
 */
export function FontsScreen({
  rows,
  builtIn,
  builtInClassName,
}: {
  rows: readonly FontRow[]
  builtIn: readonly BuiltInRow[]
  builtInClassName?: string
}) {
  const [dialog, setDialog] = useState<"google" | "upload" | null>(null)
  const [deleting, setDeleting] = useState<FontRow | null>(null)
  const css = sampleCss(rows)

  const addGoogle = (
    <Button onClick={() => setDialog("google")}>Add Google Font</Button>
  )
  const upload = (
    <Button variant="outline" onClick={() => setDialog("upload")}>
      <UploadIcon aria-hidden="true" /> Upload files
    </Button>
  )

  return (
    <>
      {/* The samples' own files, from the Site: nothing here asks Google. */}
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <PageHeader
        title="Fonts"
        description="The fonts your Theme can use. Add one from Google Fonts or upload your own files."
        action={
          <>
            {upload}
            {addGoogle}
          </>
        }
      />

      <div className="flex max-w-4xl flex-col gap-8">
        <section aria-labelledby="stored-fonts" className="flex flex-col gap-3">
          <h2 id="stored-fonts" className="text-base font-semibold">
            Your fonts
          </h2>
          {rows.length === 0 ? (
            <EmptyState
              icon={<TypeIcon />}
              title="No Fonts added yet"
              description="Add a font from Google Fonts, or upload your own files, then choose it in the Theme."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {addGoogle}
                  {upload}
                </div>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((row) => (
                <li key={row.id}>
                  <FontCard row={row} onDelete={() => setDeleting(row)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="built-in-fonts"
          className={`flex flex-col gap-3 ${builtInClassName ?? ""}`.trim()}
        >
          <div>
            <h2 id="built-in-fonts" className="text-base font-semibold">
              Built-in fonts
            </h2>
            <p className="text-sm text-muted-foreground">
              These come with the Site, so they can&apos;t be changed or
              deleted. Choose them in the Theme like any other font.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {builtIn.map((font) => (
              <li key={font.family}>
                <BuiltInCard font={font} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <AddGoogleFontSheet
        open={dialog === "google"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <UploadFontsSheet
        open={dialog === "upload"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setDeleting(null)}
          title={`Delete Font “${deleting.family}”?`}
          description={deleteDescription(deleting)}
          dependents={deleting.earlierThemeVersions.map((when) => ({
            kind: "Theme version",
            name: `saved ${formatMoment(when, { withZone: true })}`,
          }))}
          confirmLabel="Delete Font"
          onConfirm={async () => {
            const result = await deleteFont(deleting.id)
            if (result.ok) notify.success(result.message || "Deleted")
            return result
          }}
        />
      )}
    </>
  )
}

/**
 * What deleting says besides who uses the Font. The live Theme locks a Font,
 * so an unlocked one is used only by earlier Theme versions, and restoring one
 * of those afterwards uses the Classic font instead.
 */
function deleteDescription(row: FontRow): string {
  const base =
    "The Font and its files are removed from the Site. This cannot be undone."
  return row.earlierThemeVersions.length === 0
    ? base
    : `${base} Restoring one of these earlier Theme versions will use the Classic font instead.`
}

function FontCard({ row, onDelete }: { row: FontRow; onDelete: () => void }) {
  const titleId = `font-${row.id}-title`
  const reasonId = `font-${row.id}-reason`
  const family = `"${row.sampleFamily}", sans-serif`
  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-xl border bg-background p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 id={titleId} className="text-base font-semibold">
            {row.family}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{row.kindLabel}</Badge>
            <Badge variant="outline">{row.sourceLabel}</Badge>
            {row.locked && (
              <Badge variant="outline">
                <LockIcon aria-hidden="true" data-icon="inline-start" />
                In use
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={row.locked}
          aria-label={`Delete ${row.family}`}
          aria-describedby={row.locked ? reasonId : undefined}
          onClick={onDelete}
        >
          <TrashIcon aria-hidden="true" /> Delete
        </Button>
      </div>

      <p className="text-2xl leading-snug" style={{ fontFamily: family }}>
        {SAMPLE_TEXT}
      </p>

      <ul aria-label="Weights" className="flex flex-wrap gap-2 text-sm">
        {row.faces.map((face) => (
          <li
            key={`${face.weight}-${face.style}`}
            className="rounded-md bg-muted px-2 py-1"
            style={{
              fontFamily: family,
              fontWeight: face.weight,
              fontStyle: face.style,
            }}
          >
            {face.label}
          </li>
        ))}
      </ul>

      {row.locked && (
        <div className="flex flex-col gap-1 rounded-lg bg-muted/60 p-3 text-sm">
          <ul className="flex flex-col gap-0.5">
            {row.usages.map((usage) => (
              <li key={usage} className="flex items-center gap-2">
                <LockIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                {usage}
              </li>
            ))}
          </ul>
          <p id={reasonId} className="text-muted-foreground">
            {row.deleteBlockedReason}
          </p>
        </div>
      )}
    </article>
  )
}

function BuiltInCard({ font }: { font: BuiltInRow }) {
  const titleId = `built-in-${font.family.replaceAll(" ", "-")}`
  return (
    <article
      aria-labelledby={titleId}
      className="flex h-full flex-col gap-2 rounded-xl border bg-background p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={titleId} className="text-base font-semibold">
          {font.family}
        </h3>
        <Badge variant="secondary">{font.kindLabel}</Badge>
      </div>
      <p
        className="text-xl leading-snug"
        style={{ fontFamily: font.sampleFontFamily }}
      >
        {SAMPLE_TEXT}
      </p>
      <p className="text-sm text-muted-foreground">{font.summary}</p>
    </article>
  )
}
