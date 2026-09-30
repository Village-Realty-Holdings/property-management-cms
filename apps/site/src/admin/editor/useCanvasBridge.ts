"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"

import {
  postDocumentToCanvas,
  readCanvasMessage,
  type CanvasAction,
  type CanvasDocument,
} from "./bridge"
import { useEditor, type EditorApi } from "./EditorProvider"
import { blocksIn, findBlock, regionsOf } from "./state"

/**
 * Keeps the canvas showing `document`, and answers what the canvas asks for.
 *
 * Once the canvas says it is ready, and again on every change, it posts the
 * whole document to the canvas window (see bridge.ts), with the editor's
 * selected Block. The canvas redraws from that message alone, so an edit shows
 * without a request. Pass a document whose identity changes only when its
 * content does (`useMemo`), or each render posts it again.
 *
 * `ready` comes again whenever the canvas (re)loads, and each one is answered
 * with the current document, so a canvas that reloads catches up.
 *
 * The canvas's other messages become editor actions, so each is one undo step
 * like the same change made in a panel: a click selects, the Block toolbar
 * moves, duplicates and deletes, and a "+" is an insert request, handed to the
 * editor's `onInsertRequest`. The editor decides whether a request applies: a
 * Block that is not in the document being edited (one of a locked region) is
 * ignored.
 */
export function useCanvasBridge(
  frameRef: RefObject<HTMLIFrameElement | null>,
  document: CanvasDocument
): void {
  const editor = useEditor()
  const selectedId = editor.selectedId
  const latest = useRef({ document, selectedId })
  const ready = useRef(false)
  const editorRef = useRef(editor)

  const post = useCallback(() => {
    const frame = frameRef.current?.contentWindow
    if (frame) {
      const { document, selectedId } = latest.current
      postDocumentToCanvas(frame, window.location.origin, {
        ...document,
        selectedId,
      })
    }
  }, [frameRef])

  useEffect(() => {
    editorRef.current = editor
  })

  useEffect(() => {
    latest.current = { document, selectedId }
    if (ready.current) post()
  }, [document, selectedId, post])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = readCanvasMessage(event, {
        origin: window.location.origin,
        frame: frameRef.current?.contentWindow ?? null,
      })
      if (!message) return
      if (message.type === "ready") {
        ready.current = true
        post()
        return
      }
      apply(editorRef.current, message)
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [frameRef, post])
}

/** One of the canvas's requests, as an editor action. */
function apply(
  editor: EditorApi,
  action: Exclude<CanvasAction, { type: "ready" }>
) {
  switch (action.type) {
    case "select":
      // The reducer ignores an id the document does not have.
      editor.select(action.id)
      return
    case "move": {
      const found = findBlock(editor.doc, action.id)
      if (!found) return
      editor.moveBlock(
        found.region,
        found.index,
        found.index + (action.direction === "up" ? -1 : 1)
      )
      return
    }
    case "duplicate":
      editor.duplicateBlock(action.id)
      return
    case "delete":
      editor.removeBlock(action.id)
      return
    case "insert-request": {
      if (!regionsOf(editor.doc).includes(action.region)) return
      if (action.index > blocksIn(editor.doc, action.region).length) return
      editor.onInsertRequest(action.region, action.index)
      return
    }
  }
}
