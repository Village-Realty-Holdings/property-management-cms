'use client'

import { createContext, useContext } from 'react'

/**
 * A rich text field in the sidebar opens a sheet with Payload's own Lexical
 * editor for that field. The sheet needs Payload's form state machinery, so
 * it is wired in by the editor; the field only asks this context to open.
 * Without a provider (unit tests, the add dialog before the page mounts the
 * sheet) `available` is false and the field says so.
 */
export type RichTextRequest = {
  /** Field name inside its block, array row or group. */
  name: string
  label: string
  /** Schema-map key of the container that owns the field (a block, array or group). */
  schemaPath: string
  value: unknown
  onChange: (value: unknown) => void
}

type SheetApi = { available: boolean; open: (request: RichTextRequest) => void }

const SheetContext = createContext<SheetApi>({ available: false, open: () => {} })

export const useRichTextSheet = () => useContext(SheetContext)

export const RichTextSheetContext = SheetContext

/** Plain text of a Lexical state's text nodes, for a one-line summary. */
export function richTextExcerpt(value: unknown, max = 80): string {
  const parts: string[] = []
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const n = node as { text?: unknown; children?: unknown[]; root?: unknown }
    if (typeof n.text === 'string') parts.push(n.text)
    if (n.root) walk(n.root)
    if (Array.isArray(n.children)) n.children.forEach(walk)
  }
  walk(value)
  const text = parts.join(' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}
