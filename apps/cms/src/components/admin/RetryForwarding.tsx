"use client"

import { Button, toast, useConfig, useDocumentInfo } from "@payloadcms/ui"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Outcome =
  | { status: "sent"; destinations: number }
  | { status: "failed"; error: string }
  | { status: "skipped"; reason: string }
  | { error: string }

const skipped: Record<string, string> = {
  "already-sent": "This Submission was already forwarded.",
  "in-progress": "This Submission is being forwarded right now.",
  "no-destination":
    "This Site has no Forwarding Destination for this kind of Submission.",
  "not-found": "This Submission no longer exists.",
}

/**
 * "Retry forwarding" on a Submission whose forwarding failed (ADR-0014).
 * Calls `POST /api/submissions/:id/forward` (src/forwarding/endpoint.ts),
 * then reloads the document so the status, attempts and error are current.
 * Registered as a `ui` field in the Submissions sidebar, shown only while
 * `forwardingStatus` is `failed`.
 */
export function RetryForwarding() {
  const { id } = useDocumentInfo()
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (id === undefined || id === null) return null

  async function retry() {
    setBusy(true)
    try {
      const response = await fetch(
        `${serverURL}${api}/submissions/${encodeURIComponent(String(id))}/forward`,
        { method: "POST", credentials: "include" }
      )
      const outcome = (await response.json().catch(() => ({}))) as Outcome
      if ("status" in outcome && outcome.status === "sent") {
        toast.success("Submission forwarded.")
      } else if ("status" in outcome && outcome.status === "skipped") {
        toast.info(skipped[outcome.reason] ?? "Nothing to forward.")
      } else {
        toast.error("Forwarding failed again. See the error below.")
      }
    } catch {
      toast.error("Couldn't reach the CMS. Please try again.")
    } finally {
      setBusy(false)
      router.refresh()
    }
  }

  return (
    <div className="field-type" style={{ marginBottom: 0 }}>
      <Button
        buttonStyle="secondary"
        disabled={busy}
        margin={false}
        onClick={retry}
        size="medium"
      >
        {busy ? "Retrying…" : "Retry forwarding"}
      </Button>
    </div>
  )
}
