'use client'

import { createContext, useContext } from 'react'

/**
 * The rich text sheet's request channel, kept apart from the sheet itself so
 * sidebar fields can ask for it without importing Payload's admin UI (which
 * unit tests cannot load). `RichTextSheet.tsx` provides it.
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

export type SheetApi = { available: boolean; open: (request: RichTextRequest) => void }

export const RichTextSheetContext = createContext<SheetApi>({ available: false, open: () => {} })

export const useRichTextSheet = () => useContext(RichTextSheetContext)

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
