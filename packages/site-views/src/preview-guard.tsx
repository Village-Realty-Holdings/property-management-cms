"use client"

import { useEffect } from "react"

/**
 * In the CMS's Preview, links and forms don't act (ADR-0018): following one
 * would leave the Preview inside the admin. Stops link clicks and form
 * submits for the whole document before React or the browser acts on them.
 * Renders nothing, so the page looks exactly as on the Site.
 */
export function PreviewGuard() {
  useEffect(() => {
    const stop = (event: Event) => {
      const target = event.target as Element | null
      if (event.type === "click" && !target?.closest?.("a[href]")) return
      event.preventDefault()
      event.stopPropagation()
    }
    document.addEventListener("click", stop, true)
    document.addEventListener("submit", stop, true)
    return () => {
      document.removeEventListener("click", stop, true)
      document.removeEventListener("submit", stop, true)
    }
  }, [])
  return null
}
