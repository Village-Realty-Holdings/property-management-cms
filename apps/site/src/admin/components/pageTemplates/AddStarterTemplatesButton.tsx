"use client"

import { useState } from "react"
import { SparklesIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { addStarterTemplates } from "../../actions/pageTemplates"
import { InlineError, notify } from "../../kit"

const FAILED = "Something went wrong. Please try again."

/**
 * Adds the starter Page Templates (Home, Tuck-in and Guest survey) the Site doesn't have
 * yet. A toast confirms; a failure shows inline.
 */
export function AddStarterTemplatesButton({
  variant = "outline",
}: {
  variant?: "default" | "outline"
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function add() {
    setPending(true)
    setError(undefined)
    try {
      const result = await addStarterTemplates()
      if (result.ok) notify.success(result.message || "Added")
      else setError(result.message || FAILED)
    } catch {
      setError(FAILED)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant={variant} disabled={pending} onClick={add}>
        <SparklesIcon aria-hidden="true" />
        {pending ? "Adding…" : "Add starter templates"}
      </Button>
      {error && <InlineError>{error}</InlineError>}
    </div>
  )
}
