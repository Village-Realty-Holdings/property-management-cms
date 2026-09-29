"use client"

import { useRouter } from "next/navigation"
import { RefreshRouteOnSave } from "@payloadcms/live-preview-react"

/**
 * Re-renders the Preview when the Editor saves, autosave included: the admin
 * posts a message to this frame, and the route reads the Draft again.
 */
export function RefreshOnSave() {
  const router = useRouter()
  return (
    <RefreshRouteOnSave
      refresh={() => router.refresh()}
      serverURL={typeof window === "undefined" ? "" : window.location.origin}
    />
  )
}
