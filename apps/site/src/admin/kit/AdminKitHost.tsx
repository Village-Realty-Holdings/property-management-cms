"use client"

import { useEffect } from "react"

import { Toaster } from "@workspace/ui/components/sonner"

import "./admin-kit.css"
import { retainNavigationRuntime } from "./unsaved/navigationGuard"
import { SkipLink } from "./SkipLink"

/**
 * Mount once, at the top of the Admin's root layout. It provides what the kit
 * needs from the page as a whole:
 *  - the toast region (`notify` and `useSaveToast` show up here),
 *  - the skip link and the visible-focus styles,
 *  - history numbering, so the unsaved-changes guard understands back/forward
 *    even for entries visited before an editor was opened.
 */
export function AdminKitHost() {
  useEffect(() => retainNavigationRuntime(), [])
  return (
    <>
      <span data-admin-kit-host hidden />
      <SkipLink />
      <Toaster position="bottom-right" closeButton />
    </>
  )
}
