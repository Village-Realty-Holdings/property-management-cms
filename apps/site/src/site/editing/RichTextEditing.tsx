"use client"

import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import type { BaseSelection, EditorThemeClasses } from "lexical"
import { $getSelection, COMMAND_PRIORITY_LOW, KEY_DOWN_COMMAND } from "lexical"
import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react"
import { createPortal } from "react-dom"

import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "../display"
import { useCanvasSend } from "./canvasSend"
import { blockIdOf } from "./place"
import {
  applyLink,
  EDITOR_NODES,
  initialState,
  loadContent,
  readContent,
  readFormat,
  toggleFormat,
  toggleList,
  type FormatState,
} from "./richTextModel"

/**
 * A Rich text Block while the Visual Editor draws it: its Lexical JSON edited
 * in place, with a small floating toolbar (bold, italic, link, bulleted and
 * numbered list) while the text has focus.
 *
 * Every change is sent to the Admin as an `edit-text` with the whole new
 * Lexical JSON (see bridge.ts), so it shows on the canvas at once and a run of
 * typing is one undo step. Nothing is saved from here. What the Admin holds
 * comes back in `content`: when it is something this editor did not write (an
 * undo, an edit in the Block tab), the editor shows it.
 *
 * The text is drawn with the classes `RichText` uses, so it looks as it does on
 * the Site.
 *
 * The toolbar is drawn in a portal at the end of the page, so Tab does not
 * reach it. Keyboard users get it by shortcut instead: Alt+F10 moves focus into
 * the toolbar (the ARIA toolbar convention), Ctrl+K (Cmd+K) asks for a link's
 * URL, and Ctrl+B and Ctrl+I are Lexical's own. In the toolbar the arrow keys,
 * Home and End move between the buttons, and Esc or Tab return to the text.
 */

const SHORTCUTS = "Alt+F10 Control+K Meta+K"

const ACCENT = "#1d4ed8"
const INK = "#0f172a"
const Z = 2147483001

const headings = {
  h1: "text-4xl",
  h2: "text-3xl",
  h3: "text-2xl",
  h4: "text-xl",
  h5: "text-lg",
  h6: "text-base",
}

const theme: EditorThemeClasses = {
  heading: Object.fromEntries(
    Object.entries(headings).map(([tag, size]) => [
      tag,
      cn(displayFont, "mt-4 leading-tight text-balance", size),
    ])
  ),
  quote: "border-l-4 border-accent pl-4 text-lg italic",
  list: {
    ul: "flex flex-col gap-1 pl-6 list-disc",
    ol: "flex flex-col gap-1 pl-6 list-decimal",
    nested: { listitem: "list-none" },
  },
  link: "font-medium text-link underline decoration-accent decoration-2 underline-offset-4",
  text: {
    underline: "underline",
    strikethrough: "line-through",
    underlineStrikethrough: "underline line-through",
    code: "rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]",
  },
}

export function RichTextEditing({
  field,
  content,
  className,
}: {
  /** The Block's field that holds the rich text: "content". */
  field: string
  content: unknown
  className?: string
}) {
  // Read once, when the editor is made: later changes come in through `Sync`.
  const [config] = useState(() => ({
    namespace: "rich-text-editing",
    nodes: EDITOR_NODES,
    theme,
    editorState: initialState(content),
    onError: (error: Error) => {
      throw error
    },
  }))
  const [active, setActive] = useState(false)
  const toolbar = useRef<HTMLDivElement | null>(null)

  const onFocus = () => setActive(true)
  const onBlur = (event: FocusEvent) => {
    if (!toolbar.current?.contains(event.relatedTarget as Node | null)) {
      setActive(false)
    }
  }
  // These keys act on the Block (Delete removes it, Esc deselects it); while
  // text is being edited they mean something else.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (
      event.key === "Delete" ||
      event.key === "Backspace" ||
      event.key === "Escape"
    ) {
      event.stopPropagation()
    }
    if (event.key === "Escape") event.currentTarget.blur()
  }

  return (
    <LexicalComposer initialConfig={config}>
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            aria-label="Rich text"
            aria-keyshortcuts={SHORTCUTS}
            className={cn(
              "flex max-w-prose flex-col gap-4 text-base leading-relaxed text-pretty",
              className
            )}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
        }
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <ListPlugin />
      <Sync field={field} content={content} />
      {active && (
        <FloatingToolbar ref={toolbar} close={() => setActive(false)} />
      )}
    </LexicalComposer>
  )
}

/** The most emitted values remembered while they wait to come back. */
const PENDING_LIMIT = 50

/**
 * Sends the editor's changes to the Admin, and shows what the Admin holds when
 * it changed from elsewhere. The Admin echoes every value it took, so a value
 * that comes back is one this editor wrote, and is not shown again: that would
 * throw away what was typed since.
 */
function Sync({ field, content }: { field: string; content: unknown }) {
  const [editor] = useLexicalComposerContext()
  const send = useCanvasSend()
  const synced = useRef(JSON.stringify(content ?? null))
  const pending = useRef<string[]>([])
  const latest = useRef({ field, send })
  useEffect(() => {
    latest.current = { field, send }
  })

  useEffect(
    () =>
      editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, prevEditorState, tags }) => {
          if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return
          if (prevEditorState.isEmpty()) return
          if (tags.has("history-merge") || tags.has("sync-external")) return
          const { field, send } = latest.current
          const root = editor.getRootElement()
          const id = root && blockIdOf(root)
          if (!send || !id) return
          const value = readContent(editor)
          const json = JSON.stringify(value)
          pending.current = [...pending.current, json].slice(-PENDING_LIMIT)
          synced.current = json
          send({
            type: "edit-text",
            id,
            fieldPath: field,
            value: value as unknown as Record<string, unknown>,
          })
        }
      ),
    [editor]
  )

  useEffect(() => {
    const json = JSON.stringify(content ?? null)
    const echoed = pending.current.indexOf(json)
    if (echoed >= 0) {
      pending.current = pending.current.slice(echoed + 1)
      return
    }
    if (json === synced.current) return
    synced.current = json
    pending.current = []
    loadContent(editor, content, "sync-external")
  }, [editor, content])

  return null
}

// ── The floating toolbar ─────────────────────────────────────────────────────

const button: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  border: "none",
  borderRadius: 4,
  background: "transparent",
  color: "#fff",
  cursor: "pointer",
}

type Position = { left: number; top: number }

/** Where the toolbar goes: above the selection, or below it with no room above. */
function positionFor(root: HTMLElement): Position {
  const selection = root.ownerDocument.defaultView?.getSelection()
  const range =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  let rect =
    range && root.contains(range.commonAncestorContainer)
      ? range.getBoundingClientRect()
      : null
  // A caret has no box in some browsers: use the line it is on.
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    const node = range?.startContainer
    const el = node instanceof Element ? node : node?.parentElement
    rect = (el && root.contains(el) ? el : root).getBoundingClientRect()
  }
  const win = root.ownerDocument.defaultView!
  const height = 40
  const above = rect.top - height - 8 >= 4
  return {
    left: Math.max(8, Math.min(rect.left, win.innerWidth - 220)) + win.scrollX,
    top: (above ? rect.top - height - 8 : rect.bottom + 8) + win.scrollY,
  }
}

function ToolButton({
  name,
  icon,
  pressed,
  run,
  disabled = false,
  tabIndex,
}: {
  tabIndex: number
  name: string
  icon: ReactNode
  pressed?: boolean
  run: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={name}
      title={name}
      aria-pressed={pressed}
      aria-disabled={disabled || undefined}
      tabIndex={tabIndex}
      // Pressing a tool must not take the selection from the text.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (!disabled) run()
      }}
      style={{
        ...button,
        background: pressed ? ACCENT : "transparent",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {icon}
    </button>
  )
}

function FloatingToolbar({
  ref,
  close,
}: {
  ref: Ref<HTMLDivElement>
  close: () => void
}) {
  const [editor] = useLexicalComposerContext()
  const [format, setFormat] = useState<FormatState>(() =>
    editor.getEditorState().read(readFormat)
  )
  const [position, setPosition] = useState<Position | null>(() => {
    const root = editor.getRootElement()
    return root ? positionFor(root) : null
  })
  const [linking, setLinking] = useState<{ url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const saved = useRef<BaseSelection | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const self = useRef<HTMLDivElement | null>(null)
  // Roving focus: the one button Tab would land on, and arrows move.
  const [roving, setRoving] = useState(0)

  const refresh = useCallback(() => {
    const root = editor.getRootElement()
    if (!root) return
    setFormat(editor.getEditorState().read(readFormat))
    // The selection moves to the URL field while linking: stay where we are.
    if (
      !root.ownerDocument.activeElement?.closest("[data-rich-text-toolbar]")
    ) {
      setPosition(positionFor(root))
    }
  }, [editor])

  useEffect(() => {
    const doc = editor.getRootElement()?.ownerDocument
    const win = doc?.defaultView
    const off = editor.registerUpdateListener(refresh)
    doc?.addEventListener("selectionchange", refresh)
    win?.addEventListener("scroll", refresh, true)
    win?.addEventListener("resize", refresh)
    return () => {
      off()
      doc?.removeEventListener("selectionchange", refresh)
      win?.removeEventListener("scroll", refresh, true)
      win?.removeEventListener("resize", refresh)
    }
  }, [editor, refresh])

  useEffect(() => {
    if (linking) input.current?.focus()
  }, [linking])

  const toolButtons = () => [
    ...(self.current?.querySelectorAll<HTMLElement>("button") ?? []),
  ]

  const focusToolbar = () => {
    const target = linking ? input.current : toolButtons()[roving]
    target?.focus()
  }

  // The keyboard's way in: the toolbar is not in Tab order.
  const shortcuts = useRef({ focusToolbar, openLink: () => {} })
  useEffect(
    () =>
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event: globalThis.KeyboardEvent) => {
          if (event.isComposing) return false
          if (event.key === "F10" && event.altKey) {
            event.preventDefault()
            shortcuts.current.focusToolbar()
            return true
          }
          if (
            (event.key === "k" || event.key === "K") &&
            (event.ctrlKey || event.metaKey) &&
            !event.altKey
          ) {
            event.preventDefault()
            shortcuts.current.openLink()
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW
      ),
    [editor]
  )

  const setRef = (node: HTMLDivElement | null) => {
    self.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) (ref as { current: HTMLDivElement | null }).current = node
  }

  const onBlur = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null
    if (self.current?.contains(next)) return
    if (next && editor.getRootElement()?.contains(next)) return
    close()
  }

  /** Puts focus, and Lexical's selection, back in the text. */
  const backToText = () => {
    editor.getRootElement()?.focus({ preventScroll: true })
    editor.focus()
  }

  const openLink = () => {
    if (format.collapsed && !format.link) return
    editor.getEditorState().read(() => {
      saved.current = $getSelection()?.clone() ?? null
    })
    setError(null)
    setLinking({ url: format.link ?? "" })
  }

  useEffect(() => {
    shortcuts.current = { focusToolbar, openLink }
  })

  const submitLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const url = new FormData(event.currentTarget).get("url")
    const result = applyLink(editor, String(url ?? ""), saved.current)
    if (result !== true) {
      setError(result)
      return
    }
    setLinking(null)
    backToText()
  }

  const removeLink = () => {
    applyLink(editor, "", saved.current)
    setLinking(null)
    backToText()
  }

  const cancelLink = () => {
    setLinking(null)
    setError(null)
    backToText()
  }

  if (typeof document === "undefined" || !position) return null
  const doc = editor.getRootElement()?.ownerDocument ?? document

  return createPortal(
    <div
      ref={setRef}
      role="toolbar"
      aria-label="Text formatting"
      data-rich-text-toolbar=""
      onBlur={onBlur}
      onFocus={(event) => {
        const at = toolButtons().indexOf(event.target as HTMLElement)
        if (!linking && at >= 0) setRoving(at)
      }}
      onKeyDown={(event) => {
        // The toolbar is drawn inside the Block: its keys are not the Block's.
        if (event.key === "Delete" || event.key === "Backspace") {
          event.stopPropagation()
        }
        if (event.key === "Escape") {
          event.stopPropagation()
          cancelLink()
          return
        }
        if (linking) return
        const buttons = toolButtons()
        const at = buttons.indexOf(event.target as HTMLElement)
        if (at < 0) return
        let next: number | null = null
        if (event.key === "ArrowRight") next = (at + 1) % buttons.length
        else if (event.key === "ArrowLeft") {
          next = (at - 1 + buttons.length) % buttons.length
        } else if (event.key === "Home") next = 0
        else if (event.key === "End") next = buttons.length - 1
        if (next !== null) {
          event.preventDefault()
          buttons[next]!.focus()
        } else if (event.key === "Tab") {
          // Leave the toolbar for the text, not for the end of the page.
          event.preventDefault()
          backToText()
        }
      }}
      style={{
        position: "absolute",
        left: position.left,
        top: position.top,
        zIndex: Z,
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: 4,
        minHeight: 40,
        borderRadius: 6,
        background: INK,
        color: "#fff",
        font: "500 13px/1.3 system-ui, sans-serif",
        boxShadow: "0 2px 8px rgb(0 0 0 / 0.3)",
      }}
    >
      {linking ? (
        <form
          onSubmit={submitLink}
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <label style={{ display: "flex", flexDirection: "column" }}>
            <span className="sr-only">Link URL</span>
            <input
              ref={input}
              name="url"
              type="text"
              inputMode="url"
              aria-label="Link URL"
              aria-invalid={error ? true : undefined}
              placeholder="https://… or /page"
              defaultValue={linking.url}
              autoComplete="off"
              style={{
                width: 200,
                height: 28,
                padding: "0 8px",
                borderRadius: 4,
                border: "1px solid #94a3b8",
                background: "#fff",
                color: INK,
              }}
            />
          </label>
          <button
            type="submit"
            style={{
              ...button,
              width: "auto",
              padding: "0 8px",
              background: ACCENT,
            }}
          >
            Apply
          </button>
          {format.link && (
            <button
              type="button"
              onClick={removeLink}
              style={{ ...button, width: "auto", padding: "0 8px" }}
            >
              Remove link
            </button>
          )}
          <button
            type="button"
            onClick={cancelLink}
            style={{ ...button, width: "auto", padding: "0 8px" }}
          >
            Cancel
          </button>
          {error && (
            <span
              role="alert"
              style={{ maxWidth: 240, color: "#fecaca", paddingLeft: 4 }}
            >
              {error}
            </span>
          )}
        </form>
      ) : (
        <>
          <ToolButton
            name="Bold"
            tabIndex={roving === 0 ? 0 : -1}
            icon={<Bold size={16} aria-hidden />}
            pressed={format.bold}
            run={() => toggleFormat(editor, "bold")}
          />
          <ToolButton
            name="Italic"
            tabIndex={roving === 1 ? 0 : -1}
            icon={<Italic size={16} aria-hidden />}
            pressed={format.italic}
            run={() => toggleFormat(editor, "italic")}
          />
          <ToolButton
            name="Link"
            tabIndex={roving === 2 ? 0 : -1}
            icon={<LinkIcon size={16} aria-hidden />}
            pressed={format.link !== null}
            run={openLink}
            disabled={format.collapsed && !format.link}
          />
          <ToolButton
            name="Bulleted list"
            tabIndex={roving === 3 ? 0 : -1}
            icon={<List size={16} aria-hidden />}
            pressed={format.list === "bullet"}
            run={() => toggleList(editor, "bullet")}
          />
          <ToolButton
            name="Numbered list"
            tabIndex={roving === 4 ? 0 : -1}
            icon={<ListOrdered size={16} aria-hidden />}
            pressed={format.list === "number"}
            run={() => toggleList(editor, "number")}
          />
        </>
      )}
    </div>,
    doc.body
  )
}
