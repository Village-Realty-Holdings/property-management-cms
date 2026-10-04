"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { DownloadIcon, UploadIcon } from "lucide-react"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { exportPage, importPage } from "../../actions/pages"
import { InlineError, notify } from "../../kit"
import { IMPORT_MAX_BYTES, type ImportResult } from "../../pageTransfer"

const FAILED = "Something went wrong. Please try again."

/** Hands the browser a file to save. */
function download(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Export, on a row of the Pages list: downloads the Page as a file another
 * Site can import. A failure is said in the row, under the button.
 */
export function ExportPageButton({ id, title }: { id: number; title: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function run() {
    setPending(true)
    setError(undefined)
    try {
      const result = await exportPage(id)
      if (result.ok) {
        download(result.filename, result.json)
        notify.success(`Exported “${title}”`)
      } else setError(result.message)
    } catch {
      setError(FAILED)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        aria-label={`Export ${title}`}
        onClick={run}
      >
        <DownloadIcon aria-hidden="true" /> Export
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive-text">
          {error}
        </p>
      )}
    </>
  )
}

/**
 * Import, in the Pages list's header: takes a Page file and adds it as a new
 * Draft. The dialog then says where the Page is and what the Site did not
 * have (an image, a Layout), or why the file could not be imported.
 */
export function ImportPageButton() {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<ImportResult>()

  async function take(file: File | undefined) {
    if (!file) return
    if (file.size > IMPORT_MAX_BYTES) {
      setResult({ ok: false, message: "That file is too large to be a Page." })
      return
    }
    setPending(true)
    try {
      setResult(await importPage(await file.text()))
    } catch {
      setResult({ ok: false, message: FAILED })
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => input.current?.click()}
      >
        <UploadIcon aria-hidden="true" /> {pending ? "Importing…" : "Import"}
      </Button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        aria-label="Page file to import"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          void take(file)
        }}
      />
      <Dialog
        open={result !== undefined}
        onOpenChange={(open) => !open && setResult(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {result?.ok ? "Page imported" : "The Page was not imported"}
            </DialogTitle>
            {result?.ok && (
              <DialogDescription>{result.message}</DialogDescription>
            )}
          </DialogHeader>
          {result && !result.ok && <InlineError>{result.message}</InlineError>}
          {result?.notes && result.notes.length > 0 && (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResult(undefined)}
            >
              Close
            </Button>
            {result?.ok && result.id && (
              <Link
                href={`/admin/pages/${result.id}`}
                className={buttonVariants()}
              >
                Edit the Page
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
