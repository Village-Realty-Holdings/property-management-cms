"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"

import {
  acceptsTextEdit,
  postDocumentToCanvas,
  readCanvasMessage,
  type CanvasAction,
  type CanvasDocument,
} from "./bridge"
import { useEditor, type EditorApi } from "./EditorProvider"
import { blocksOfList, findBlock } from "./state"

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
 * moves, duplicates and deletes, and a "+" is an insert request, in a region
 * or in a Container, handed to the editor's `onInsertRequest`. Text edited in place (`edit-text`) is a
 * `setField` of that Block's field, found by its id at any depth, so typing
 * is one coalesced undo step. The
 * editor decides whether a request applies: a Block that is not in the
 * document being edited (one of a locked region) is ignored, and so is a value
 * the field cannot take.
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
        found.index + (action.direction === "up" ? -1 : 1),
        found.parentId
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
      // A list the document has: the region's own, or a Container's in it.
      const { region, index, parentId } = action
      const blocks = blocksOfList(editor.doc, { region, parentId })
      if (!blocks || index > blocks.length) return
      if (parentId === undefined) editor.onInsertRequest(region, index)
      else editor.onInsertRequest(region, index, parentId)
      return
    }
    case "key":
      // Shortcuts are the shell's (see useEditorShortcuts).
      return
    case "edit-text": {
      // Only a field the Block has, and only a value of its kind: the canvas
      // asks, and the document decides.
      const found = findBlock(editor.doc, action.id)
      if (!found) return
      const current = action.fieldPath
        .split(".")
        .reduce<unknown>(
          (node, key) =>
            typeof node === "object" && node !== null
              ? (node as Record<string, unknown>)[key]
              : undefined,
          found.block
        )
      if (!acceptsTextEdit(current, action.value)) return
      // Each input is a setField of the same field, so a run of typing is one
      // undo step (see the reducer's coalescing).
      editor.setField([...found.path, action.fieldPath].join("."), action.value)
      return
    }
  }
}
