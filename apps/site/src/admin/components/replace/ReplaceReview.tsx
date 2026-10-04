"use client"

import { useId, useState } from "react"
import Link from "next/link"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"

import { InlineError } from "../../kit"
import type {
  ReplaceMode,
  ReplacePreview,
  ReplaceResult,
  ReplaceRow,
} from "../../replace/run"

const FAILED = "Something went wrong. Please try again."

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`

/** "2 Layouts and the Brand", for the documents that have no Drafts. */
export function liveSummary(rows: readonly ReplaceRow[]): string {
  const layouts = rows.filter((row) => row.kind === "Layout").length
  const parts = [
    ...(layouts > 0 ? [plural(layouts, "Layout")] : []),
    ...rows
      .filter((row) => row.kind === "Brand" || row.kind === "SEO")
      .map((row) => (row.kind === "Brand" ? "the Brand" : "SEO")),
  ]
  return parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
}

/**
 * What a site-wide replace would change, and the button that makes it. The
 * confirmation asks whether Pages are saved as Drafts or published now, and
 * says which documents change on the Site either way.
 */
export function ReplaceReview({
  preview,
  what,
  unit,
  onApply,
  onDone,
}: {
  preview: ReplacePreview
  /** The confirmation's title: "Replace “Awayday” with “Away Day”?" */
  what: string
  /** What is counted: "match" for text, "use" for an image. */
  unit: string
  onApply: (mode: ReplaceMode) => Promise<ReplaceResult>
  onDone: (result: ReplaceResult) => void
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ReplaceMode>("draft")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const draftId = useId()
  const publishId = useId()

  const pages = preview.rows.filter((row) => !row.live)
  const live = preview.rows.filter((row) => row.live)
  const waiting = pages.some((row) => row.publishedMatches !== undefined)
  const publishedOnly = pages.filter((row) => row.matches === 0).length

  if (preview.rows.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Nothing on the Site matches.
      </p>
    )
  }

  async function confirm() {
    setPending(true)
    setError(undefined)
    try {
      const result = await onApply(mode)
      if (!result.ok && result.outcomes.length === 0) {
        setError(result.message || FAILED)
        return
      }
      setOpen(false)
      onDone(result)
    } catch {
      setError(FAILED)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm">
          {plural(
            preview.total,
            unit,
            unit === "match" ? "matches" : undefined
          )}{" "}
          in {plural(preview.rows.length, "place")}.
        </p>
        <Button type="button" onClick={() => setOpen(true)}>
          Replace…
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="w-full text-sm">
          <caption className="sr-only">What would change</caption>
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Name
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Where
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                {unit === "match" ? "Matches" : "Uses"}
              </th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <tr key={row.href} className="border-b align-top last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  <Link
                    href={row.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {row.title}
                  </Link>
                  <span className="block font-normal text-muted-foreground">
                    {row.kind}
                    {row.live && ", live on save"}
                  </span>
                </th>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.places.length > 0 ? (
                    <ul className="flex flex-col gap-0.5">
                      {row.places.map((place, index) => (
                        <li key={index}>{place}</li>
                      ))}
                    </ul>
                  ) : (
                    "Not in the Draft"
                  )}
                  {row.publishedMatches !== undefined && (
                    <p className="mt-1">
                      Published copy:{" "}
                      {plural(
                        row.publishedMatches,
                        unit,
                        unit === "match" ? "matches" : undefined
                      )}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.matches}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{what}</AlertDialogTitle>
            <AlertDialogDescription>
              {plural(preview.rows.length, "place")} will change. Each change is
              kept in the history of its Page or Layout.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pages.length > 0 && (
            <RadioGroup
              aria-label={`How to save ${plural(pages.length, "Page")}`}
              value={mode}
              onValueChange={(value) => setMode(value as ReplaceMode)}
              className="gap-3 text-sm"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem id={draftId} value="draft" className="mt-0.5" />
                <div>
                  <Label htmlFor={draftId}>Save as Drafts</Label>
                  <p className="text-muted-foreground">
                    The Site stays as it is until you publish each Page.
                    {publishedOnly > 0 &&
                      ` ${plural(publishedOnly, "Page has", "Pages have")} it only in the Published copy, and will not change.`}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem
                  id={publishId}
                  value="publish"
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor={publishId}>Publish now</Label>
                  <p className="text-muted-foreground">
                    Published Pages change on the Site straight away. A Page
                    that was never published stays a Draft.
                    {waiting && " Changes waiting in a Draft stay unpublished."}
                  </p>
                </div>
              </div>
            </RadioGroup>
          )}
          {live.length > 0 && (
            <p className="text-sm">
              {liveSummary(live).replace(/^./, (c) => c.toUpperCase())}{" "}
              {live.length === 1 ? "has" : "have"} no Drafts:{" "}
              {live.length === 1 ? "it changes" : "they change"} on the Site
              straight away.
            </p>
          )}
          {live.length > 0 && (
            <ul
              aria-label="Changed on the Site straight away"
              className="-mt-2 flex max-h-32 list-disc flex-col gap-0.5 overflow-y-auto pl-5 text-sm text-muted-foreground"
            >
              {live.map((row) => (
                <li key={row.href}>
                  {row.kind === row.title
                    ? row.kind
                    : `${row.kind}: ${row.title}`}
                </li>
              ))}
            </ul>
          )}
          {error && <InlineError>{error}</InlineError>}
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={pending} onClick={confirm}>
              {pending ? "Working…" : "Replace"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** What a replace did, document by document; failures first. */
export function ReplaceOutcomes({ result }: { result: ReplaceResult }) {
  const failed = result.outcomes.filter((outcome) => !outcome.ok)
  const done = result.outcomes.filter((outcome) => outcome.ok)
  return (
    <div className="flex flex-col gap-3">
      {failed.length > 0 ? (
        <InlineError>
          <p>{result.message}</p>
          <ul className="mt-1 list-disc pl-5">
            {failed.map((outcome) => (
              <li key={outcome.href}>
                <Link href={outcome.href} className="underline">
                  {outcome.title}
                </Link>
                : {outcome.message}
              </li>
            ))}
          </ul>
        </InlineError>
      ) : (
        <p role="status" className="text-sm font-medium">
          {result.message}
        </p>
      )}
      {done.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {done.map((outcome) => (
            <li key={outcome.href}>
              <Link
                href={outcome.href}
                className="font-medium underline-offset-4 hover:underline"
              >
                {outcome.title}
              </Link>{" "}
              <span className="text-muted-foreground">
                {outcome.kind === outcome.title ? "" : `${outcome.kind}, `}
                {outcome.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
