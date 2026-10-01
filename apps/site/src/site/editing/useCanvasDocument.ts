"use client"

import { useEffect, useState } from "react"

import {
  postReadyToParent,
  readParentMessage,
  type CanvasDocument,
} from "../../admin/editor/bridge"

/** How often the canvas says it is ready, until a document arrives. */
const ANNOUNCE_EVERY_MS = 500

/**
 * The document the Visual Editor last posted to this canvas, or null until one
 * arrives. The canvas renders from nothing else, so what it shows is always
 * what the Admin holds, and an edit needs no request.
 *
 * Only a `document` from the parent window on this origin is read (see
 * bridge.ts); anything else, and a malformed document, is ignored and the
 * last good one stays. The canvas announces `ready` once its listener is on,
 * and again every half second until a document arrives, so an Admin that
 * hydrates after the canvas loaded still finds it.
 */
export function useCanvasDocument(): CanvasDocument | null {
  const [document, setDocument] = useState<CanvasDocument | null>(null)

  useEffect(() => {
    const origin = window.location.origin
    const parent = window.parent
    let received = false

    const onMessage = (event: MessageEvent) => {
      const next = readParentMessage(event, { origin, parent })
      if (!next) return
      received = true
      clearInterval(timer)
      setDocument(next)
    }
    window.addEventListener("message", onMessage)

    const announce = () => postReadyToParent(parent, origin)
    const timer = setInterval(() => {
      if (!received) announce()
    }, ANNOUNCE_EVERY_MS)
    announce()

    return () => {
      window.removeEventListener("message", onMessage)
      clearInterval(timer)
    }
  }, [])

  return document
}
