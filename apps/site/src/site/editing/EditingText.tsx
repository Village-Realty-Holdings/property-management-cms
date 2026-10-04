"use client"

import {
  createElement,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react"

import { useCanvasSend } from "./canvasSend"
import { blockIdOf } from "./place"

/**
 * `text` on one line, where it differs from `before`: only the line breaks
 * typed or pasted during this edit become a space. Line breaks the field
 * already held stay, so editing one word of a stored multi-line text does not
 * rewrite the rest of it.
 */
export function collapseTyped(before: string, text: string): string {
  let head = 0
  const most = Math.min(before.length, text.length)
  while (head < most && before[head] === text[head]) head++
  let tail = 0
  while (
    tail < most - head &&
    before[before.length - 1 - tail] === text[text.length - 1 - tail]
  ) {
    tail++
  }
  const changed = text.slice(head, text.length - tail)
  if (!changed.includes("\n")) return text
  // Whitespace around a typed break belongs to the break, even when it is
  // part of the unchanged text: take it into the changed part.
  let from = head
  while (from > 0 && /[^\S\n]/.test(text[from - 1]!)) from--
  let to = text.length - tail
  while (to < text.length && /[^\S\n]/.test(text[to]!)) to++
  return (
    text.slice(0, from) +
    text.slice(from, to).replace(/\s*\n\s*/g, " ") +
    text.slice(to)
  )
}

/**
 * A Block's plain text while the Visual Editor draws it: editable in place,
 * as plain text.
 *
 * Every input is sent to the Admin as an `edit-text` with the whole new value
 * (see bridge.ts), naming the Block by the id of its innermost frame, which
 * shows on the canvas at once and is one undo step for
 * the run of typing. Enter ends the edit on a single line; Esc puts back the
 * text the edit started with.
 *
 * The browser owns the text while it is being edited, so React must not
 * redraw it: the children from when the edit started are kept until it ends,
 * and then the element is drawn afresh from what the Admin holds. That also
 * keeps a text that has inline markup (a Hero's accent word) in step.
 */
export function EditingText({
  as: Tag,
  field,
  index,
  multiline = false,
  children,
  ...rest
}: Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  as: ElementType
  field: string
  /** The Block's `context.index`, which it is marked with. */
  index: number
  /** Whether Enter adds a line. By default Enter ends the edit. */
  multiline?: boolean
  children: ReactNode
}) {
  const send = useCanvasSend()
  // `epoch` draws the element afresh when an edit ends; `started` holds what
  // it showed when the edit began, for as long as it lasts.
  const [epoch, setEpoch] = useState(0)
  const [started, setStarted] = useState<{
    children: ReactNode
    text: string
  } | null>(null)

  const post = (el: HTMLElement, value: string) => {
    const id = blockIdOf(el)
    if (id) send?.({ type: "edit-text", id, fieldPath: field, value })
  }

  const onInput = (event: FormEvent<HTMLElement>) => {
    const el = event.currentTarget
    const text = el.textContent ?? ""
    post(el, multiline ? text : collapseTyped(started?.text ?? "", text))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const el = event.currentTarget
    // These keys act on the Block (Delete removes it, Esc deselects it); while
    // a text is being edited they mean something else.
    if (
      event.key === "Delete" ||
      event.key === "Backspace" ||
      event.key === "Escape" ||
      event.key === "Enter"
    ) {
      event.stopPropagation()
    }
    if (event.nativeEvent.isComposing) return
    if (event.key === "Enter" && !multiline) {
      event.preventDefault()
      el.blur()
    } else if (event.key === "Escape") {
      event.preventDefault()
      if (started) {
        el.textContent = started.text
        post(el, started.text)
      }
      el.blur()
    }
  }

  return createElement(
    Tag,
    {
      ...rest,
      key: epoch,
      contentEditable: "plaintext-only",
      suppressContentEditableWarning: true,
      "data-block-index": index,
      "data-editable-field": field,
      onFocus: (event: FocusEvent<HTMLElement>) =>
        setStarted({ children, text: event.currentTarget.textContent ?? "" }),
      onBlur: () => {
        if (!started) return
        setStarted(null)
        setEpoch((n) => n + 1)
      },
      onInput,
      onKeyDown,
    },
    started ? started.children : children
  )
}
