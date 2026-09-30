"use client"

import { useEffect, useRef } from "react"

import { readCanvasMessage } from "./bridge"
import { useEditor } from "./EditorProvider"
import {
  isChord,
  isInOverlay,
  isTypingTarget,
  shortcutFor,
  type Shortcut,
} from "./shortcuts"

/**
 * The Visual Editor's keyboard shortcuts (see shortcuts.ts for the keys).
 * Mount it once, inside the `<EditorProvider>`.
 *
 *  - Ctrl-K asks for the Page picker (`onPickPage`);
 *  - Ctrl-S calls `onSave`, the mode's primary save, when `canSave`; the
 *    browser's own save dialog never opens;
 *  - Ctrl-Z and Ctrl-Shift-Z undo and redo;
 *  - Esc deselects the Block, and Delete removes it;
 *
 * with Cmd in place of Ctrl on macOS. Delete and Esc do nothing while text is
 * being typed (an input, or an in-place text edit), where they belong to the
 * text, and nothing but Ctrl-K and Ctrl-S runs inside an open dialog or menu.
 *
 * The same keys pressed while focus is in the canvas iframe arrive as the
 * canvas's `key` message (see bridge.ts), already filtered there, and run the
 * same way.
 */
export function useEditorShortcuts({
  onSave,
  canSave,
  onPickPage,
  canvasWindow,
}: {
  onSave: () => unknown
  /** Whether the document can be saved now (it has changes, no save is running). */
  canSave: boolean
  /** Opens the Ctrl-K Page picker. */
  onPickPage: () => void
  /** The canvas iframe's window; its `key` messages are the forwarded keys. */
  canvasWindow: () => Window | null
}): void {
  const editor = useEditor()
  const latest = useRef({ editor, onSave, canSave, onPickPage, canvasWindow })
  useEffect(() => {
    latest.current = { editor, onSave, canSave, onPickPage, canvasWindow }
  })

  useEffect(() => {
    const run = (shortcut: Shortcut) => {
      const { editor, onSave, canSave, onPickPage } = latest.current
      switch (shortcut) {
        case "pick":
          onPickPage()
          return
        case "save":
          if (canSave) void onSave()
          return
        case "undo":
          editor.undo()
          return
        case "redo":
          editor.redo()
          return
        case "deselect":
          editor.deselect()
          return
        case "remove":
          // Only the selected Block; the reducer ignores one the document
          // does not have.
          if (editor.selectedId) editor.removeBlock(editor.selectedId)
          return
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return
      const shortcut = shortcutFor(event)
      if (!shortcut) return
      if (isInOverlay(event.target)) {
        // The dialog or menu owns its keys; only the two that mean the same
        // everywhere (and have a browser default to stop) still run.
        if (shortcut !== "pick" && shortcut !== "save") return
      } else if (!isChord(shortcut) && isTypingTarget(event.target)) {
        return
      }
      // Not the browser's own Ctrl-K, Ctrl-S or Ctrl-Z.
      if (isChord(shortcut)) event.preventDefault()
      run(shortcut)
    }

    const onMessage = (event: MessageEvent) => {
      const message = readCanvasMessage(event, {
        origin: window.location.origin,
        frame: latest.current.canvasWindow(),
      })
      if (message?.type !== "key") return
      const shortcut = shortcutFor({
        key: message.key,
        ctrlKey: message.mod,
        metaKey: false,
        shiftKey: message.shift,
        altKey: false,
      })
      if (shortcut) run(shortcut)
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("message", onMessage)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("message", onMessage)
    }
  }, [])
}
