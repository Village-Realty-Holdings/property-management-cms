/**
 * The Visual Editor's keyboard shortcuts, as plain data and pure functions so
 * the Admin and the canvas (which forwards the same keys over the bridge)
 * read a key press the same way.
 *
 * Ctrl on Windows and Linux, Cmd on macOS: either modifier counts anywhere.
 */

export type Shortcut = "pick" | "save" | "undo" | "redo" | "deselect" | "remove"

/** The parts of a `KeyboardEvent` a shortcut is read from. */
export type KeyLike = {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

/** What shows in the help popover, in order. */
export const SHORTCUT_HELP: readonly {
  shortcut: Shortcut
  keys: string
  label: string
}[] = [
  { shortcut: "pick", keys: "Ctrl K", label: "Go to a Page" },
  { shortcut: "save", keys: "Ctrl S", label: "Save" },
  { shortcut: "undo", keys: "Ctrl Z", label: "Undo" },
  { shortcut: "redo", keys: "Ctrl Shift Z", label: "Redo" },
  { shortcut: "deselect", keys: "Esc", label: "Deselect the Block" },
  { shortcut: "remove", keys: "Delete", label: "Remove the selected Block" },
]

/** Which shortcut a key press is, or null when it is not one. */
export function shortcutFor(event: KeyLike): Shortcut | null {
  if (event.altKey) return null
  const mod = event.ctrlKey || event.metaKey
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
  if (mod) {
    switch (key) {
      case "k":
        return event.shiftKey ? null : "pick"
      case "s":
        return event.shiftKey ? null : "save"
      case "z":
        return event.shiftKey ? "redo" : "undo"
      default:
        return null
    }
  }
  if (event.shiftKey) return null
  if (key === "Escape") return "deselect"
  if (key === "Delete") return "remove"
  return null
}

/** Whether a shortcut is a chord with Ctrl or Cmd (the browser has its own for those). */
export const isChord = (shortcut: Shortcut) =>
  shortcut !== "deselect" && shortcut !== "remove"

const TYPING =
  "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox'], [role='combobox'], [role='searchbox']"

const OVERLAY =
  "[role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox']"

const closest = (target: EventTarget | null, selector: string) =>
  !!target &&
  typeof (target as Element).closest === "function" &&
  (target as Element).closest(selector) !== null

/**
 * Whether the target is somewhere text is typed: an input, a textarea, a
 * select, or an in-place text edit. Delete and Esc belong to the text there.
 */
export const isTypingTarget = (target: EventTarget | null) =>
  closest(target, TYPING)

/** Whether the target is inside an open dialog or menu, which own their keys. */
export const isInOverlay = (target: EventTarget | null) =>
  closest(target, OVERLAY)
