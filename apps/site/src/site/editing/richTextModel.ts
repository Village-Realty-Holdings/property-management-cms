import { $isLinkNode, $toggleLink, LinkNode } from "@lexical/link"
import {
  $insertList,
  $isListNode,
  $removeList,
  ListItemNode,
  ListNode,
} from "@lexical/list"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { $findMatchingParent } from "@lexical/utils"
import {
  $getSelection,
  $isRangeSelection,
  $setSelection,
  createEditor,
  type BaseSelection,
  type LexicalEditor,
  type SerializedEditorState,
} from "lexical"

import { validateHref } from "../../fields/link"

/**
 * Rich text, edited in place: Payload's Lexical JSON in, Lexical JSON out, so
 * what the Visual Editor writes is what the Rich text Block's field stores and
 * what `RichText` renders. This is the editor's model: no DOM and no React,
 * so the same code runs in the canvas and in tests.
 *
 * What it edits are the nodes the Site renders and the Block's editor makes:
 * paragraphs, headings, quotes, bulleted and numbered lists, links, and bold
 * and italic (and the other text formats, which it keeps). Content with
 * anything else in it (a rule, a checklist) is not edited in place, so
 * nothing is ever dropped: it is edited in the Block tab (see
 * `canEditInPlace`).
 */

/** The node classes the editor knows, besides Lexical's own paragraph and text. */
export const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
]

type Json = Record<string, unknown> & { children?: Json[] }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export { canEditInPlace } from "./canEditInPlace"

// ── Payload's JSON and the editor's ──────────────────────────────────────────

const emptyParagraph = (): Json => ({
  type: "paragraph",
  version: 1,
  direction: null,
  format: "",
  indent: 0,
  children: [],
})

/** Payload's link `{ fields: { url, newTab } }`, as the editor's link node. */
function toEditor(node: Json): Json {
  const children = node.children?.map(toEditor)
  if (node.type !== "link") return children ? { ...node, children } : node
  const fields = (isRecord(node.fields) ? node.fields : {}) as {
    url?: unknown
    newTab?: unknown
  }
  const newTab = fields.newTab === true
  return {
    ...node,
    children,
    url: typeof fields.url === "string" ? fields.url : "",
    target: newTab ? "_blank" : null,
    rel: newTab ? "noopener noreferrer" : null,
    title: null,
  }
}

/** The editor's link node, as Payload stores a link. */
function toPayload(node: Json): Json {
  const children = node.children?.map(toPayload)
  if (node.type !== "link") return children ? { ...node, children } : node
  return {
    type: "link",
    version: 3,
    direction: node.direction ?? null,
    format: node.format ?? "",
    indent: node.indent ?? 0,
    fields: {
      linkType: "custom",
      newTab: node.target === "_blank",
      url: node.url,
    },
    children: children ?? [],
  }
}

/** A headless editor with the editor's nodes, which throws on its errors. */
export function createHeadlessEditor(): LexicalEditor {
  return createEditor({
    namespace: "rich-text-editing",
    nodes: EDITOR_NODES,
    onError: (error) => {
      throw error
    },
  })
}

/** The editor's initial state for `content`: an empty paragraph when it has none. */
export function initialState(content: unknown): string {
  const root = (
    isRecord(content) && isRecord(content.root)
      ? content.root
      : {
          type: "root",
          version: 1,
          direction: null,
          format: "",
          indent: 0,
        }
  ) as Json
  const children = root.children?.length
    ? root.children.map(toEditor)
    : [emptyParagraph()]
  return JSON.stringify({ root: { ...root, children } })
}

/**
 * Shows `content` in `editor`, which is not an edit of it. `tag` marks the
 * update, so a listener can tell it from the Staff User's own changes.
 */
export function loadContent(
  editor: LexicalEditor,
  content: unknown,
  tag?: string
): void {
  editor.setEditorState(
    editor.parseEditorState(initialState(content)),
    tag ? { tag } : undefined
  )
}

/** `editor`'s content, as the Lexical JSON the Rich text Block stores. */
export function readContent(editor: LexicalEditor): SerializedEditorState {
  const { root } = editor.getEditorState().toJSON()
  return { root: toPayload(root as unknown as Json) } as SerializedEditorState
}

// ── Formatting ───────────────────────────────────────────────────────────────

const now = { discrete: true } as const

/** Bold or italic on the selection: on when any of it is off, off when all of it is on. */
export function toggleFormat(
  editor: LexicalEditor,
  format: "bold" | "italic"
): void {
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) selection.formatText(format)
  }, now)
}

/**
 * A bulleted or numbered list of the selected lines. On lines already in that
 * kind of list it lifts them out again; in the other kind it changes the kind.
 */
export function toggleList(
  editor: LexicalEditor,
  type: "bullet" | "number"
): void {
  editor.update(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return
    const list = $findMatchingParent(selection.anchor.getNode(), $isListNode)
    if (list && list.getListType() === type) $removeList()
    else $insertList(type)
  }, now)
}

/**
 * Links the selected text to `url`, changes the link it is in, or takes the
 * link off when `url` is empty. `selection` puts the selection back first, for
 * when the editor lost it to the URL field. True when it applied, and
 * otherwise why not: a URL must be a Site path, a full URL, mail or a phone
 * number (see `validateHref`).
 */
export function applyLink(
  editor: LexicalEditor,
  url: string,
  selection?: BaseSelection | null
): true | string {
  const href = url.trim()
  if (href !== "") {
    const problem = validateHref(href)
    if (problem !== true) return problem
  }
  editor.update(() => {
    if (selection) $setSelection(selection.clone())
    $toggleLink(href === "" ? null : href)
  }, now)
  return true
}

/** What the toolbar shows about the selection. */
export type FormatState = {
  bold: boolean
  italic: boolean
  list: "bullet" | "number" | null
  /** The URL of the link the selection is in. */
  link: string | null
  /** Whether nothing is selected, only a caret. */
  collapsed: boolean
}

export const NO_FORMAT: FormatState = {
  bold: false,
  italic: false,
  list: null,
  link: null,
  collapsed: true,
}

/** The selection's formats, in a read of the editor's state. */
export function readFormat(): FormatState {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return NO_FORMAT
  const node = selection.anchor.getNode()
  const list = $findMatchingParent(node, $isListNode)?.getListType()
  const link = $findMatchingParent(node, $isLinkNode)
  return {
    bold: selection.hasFormat("bold"),
    italic: selection.hasFormat("italic"),
    list: list === "bullet" || list === "number" ? list : null,
    link: link?.getURL() ?? null,
    collapsed: selection.isCollapsed(),
  }
}
