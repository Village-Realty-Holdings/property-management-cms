"use client"

import { useState } from "react"
import { CopyIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { duplicatePage } from "../actions/pages"
import { ExportPageButton } from "../components/pages/PageTransfer"
import { InlineError, notify } from "../kit"

const FAILED = "Something went wrong. Please try again."

/**
 * Duplicate and Export for one row of the Pages list. Duplicate adds a Draft
 * copy and confirms with a toast, staying on the list; a failure shows
 * inline. Export downloads the Page as a file another Site can import.
 */
export function PageRowActions({ id, title }: { id: number; title: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function copy() {
    setPending(true)
    setError(undefined)
    try {
      const result = await duplicatePage(id)
      if (result.ok) notify.success(result.message || "Duplicated")
      else setError(result.message || FAILED)
    } catch {
      setError(FAILED)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          aria-label={`Duplicate ${title}`}
          onClick={copy}
        >
          <CopyIcon aria-hidden="true" /> Duplicate
        </Button>
        <div className="flex flex-col items-end">
          <ExportPageButton id={id} title={title} />
        </div>
      </div>
      {error && <InlineError>{error}</InlineError>}
    </div>
  )
}
