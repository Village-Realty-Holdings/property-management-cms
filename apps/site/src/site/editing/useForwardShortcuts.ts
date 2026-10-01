"use client"

import { useEffect } from "react"

import type { CanvasRequest } from "../../admin/editor/bridge"
import {
  isChord,
  isInOverlay,
  isTypingTarget,
  shortcutFor,
} from "../../admin/editor/shortcuts"

/** Whether the target is in a plain-text in-place edit, not a Lexical rich text one. */
function isPlainTextEdit(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false
  const element = target as Element
  return (
    element.closest("[data-editable-field]") !== null &&
    element.closest("[data-lexical-editor]") === null
  )
}

/**
 * While focus is in the canvas the Admin's window gets no key events, so the
 * canvas forwards the editor's shortcut keys (see shortcuts.ts) as `key`
 * messages, and the Admin runs them as if they were pressed there.
 *
 * Delete and Esc stay with the text while it is typed in place (an in-place
 * edit has its own Esc, which reverts it), and with an open dialog or menu.
 * A key another handler already took is left alone. The Ctrl chords are
 * stopped here so the browser's own (save the page, focus the address bar)
 * does not run in the canvas either.
 *
 * Undo and redo are the exception while text is typed in place as plain text
 * (see EditingText): the browser owns that text and its own undo, which posts
 * the result through `input`, so the key is neither forwarded nor stopped. The
 * Admin's undo would change the document but not the text on screen. A rich
 * text edit has no undo of its own and shows what the Admin changed, so it
 * forwards them.
 */
export function useForwardShortcuts(
  send: (request: CanvasRequest) => void
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      const shortcut = shortcutFor(event)
      if (!shortcut) return
      if (
        !isChord(shortcut) &&
        (isTypingTarget(event.target) || isInOverlay(event.target))
      ) {
        return
      }
      if (
        (shortcut === "undo" || shortcut === "redo") &&
        isPlainTextEdit(event.target)
      ) {
        return
      }
      if (isChord(shortcut)) event.preventDefault()
      send({
        type: "key",
        key: event.key,
        mod: event.ctrlKey || event.metaKey,
        shift: event.shiftKey,
      })
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [send])
}
