"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"

import {
  postDocumentToCanvas,
  readCanvasMessage,
  type CanvasDocument,
} from "./bridge"

/**
 * Keeps the canvas showing `document`. Once the canvas says it is ready, and
 * again on every change, it posts the whole document to the canvas window (see
 * bridge.ts). The canvas redraws from that message alone, so an edit shows
 * without a request. Pass a document whose identity changes only when its
 * content does (`useMemo`), or each render posts it again.
 *
 * `ready` comes again whenever the canvas (re)loads, and each one is answered
 * with the current document, so a canvas that reloads catches up.
 */
export function useCanvasBridge(
  frameRef: RefObject<HTMLIFrameElement | null>,
  document: CanvasDocument
): void {
  const latest = useRef(document)
  const ready = useRef(false)

  const post = useCallback(() => {
    const frame = frameRef.current?.contentWindow
    if (frame) {
      postDocumentToCanvas(frame, window.location.origin, latest.current)
    }
  }, [frameRef])

  useEffect(() => {
    latest.current = document
    if (ready.current) post()
  }, [document, post])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = readCanvasMessage(event, {
        origin: window.location.origin,
        frame: frameRef.current?.contentWindow ?? null,
      })
      if (message?.type !== "ready") return
      ready.current = true
      post()
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [frameRef, post])
}
