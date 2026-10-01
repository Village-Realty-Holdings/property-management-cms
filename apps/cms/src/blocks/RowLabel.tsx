"use client"

import { Pill, useRowLabel } from "@payloadcms/ui"

type RowData = Record<string, unknown>

/**
 * The text a row is labelled with: the first non-empty `fields` value (plain
 * text, or the text of a rich-text value), else the Block's name.
 */
export function rowTitle(data: RowData | undefined, fields: string[]) {
  for (const name of fields) {
    const text = plainText(data?.[name]).trim()
    if (text) return text.length > 80 ? `${text.slice(0, 79)}…` : text
  }
  const blockName = data?.blockName
  return typeof blockName === "string" && blockName.trim()
    ? blockName.trim()
    : ""
}

/** A string, or the text of a Lexical value up to the first paragraph break. */
function plainText(value: unknown): string {
  if (typeof value === "string") return value
  const root = (value as { root?: unknown } | null | undefined)?.root
  if (!root) return ""
  const parts: string[] = []
  const walk = (node: unknown) => {
    if (parts.join("").length > 80 || !node || typeof node !== "object") return
    const { text, children } = node as { text?: unknown; children?: unknown }
    if (typeof text === "string") parts.push(text)
    if (Array.isArray(children)) {
      for (const child of children) {
        walk(child)
        if (parts.length) break
      }
    }
  }
  walk(root)
  return parts.join(" ")
}

type BlockRowLabelProps = {
  /** The Block's singular label, shown as a pill (e.g. "Hero"). */
  blockLabel: string
  /** Row fields to take the title from, in order (e.g. ["heading"]). */
  fields?: string[]
}

/**
 * The header of a Block row on a Page: its number, the Block type, and its
 * heading (instead of the empty "Untitled" block name).
 * Registered as each Block's `admin.components.Label`.
 */
export function BlockRowLabel({
  blockLabel,
  fields = ["heading"],
}: BlockRowLabelProps) {
  const { data, rowNumber } = useRowLabel<RowData>()
  const title = rowTitle(data, fields)
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "calc(var(--base) * 0.5)",
        pointerEvents: "none",
      }}
    >
      <span className="blocks-field__block-number">
        {String((rowNumber ?? 0) + 1).padStart(2, "0")}
      </span>
      <Pill className="blocks-field__block-pill" pillStyle="white" size="small">
        {blockLabel}
      </Pill>
      <span style={title ? undefined : { opacity: 0.6, fontStyle: "italic" }}>
        {title || "No heading"}
      </span>
    </span>
  )
}

type ArrayRowLabelProps = {
  /** Row fields to take the label from, in order (e.g. ["question"]). */
  fields: string[]
  /** Used with the row number when those fields are empty (e.g. "Question"). */
  fallback: string
}

/**
 * An array row labelled by its content (e.g. an FAQ item's question) instead
 * of "Question 01". Registered as the array's `admin.components.RowLabel`.
 */
export function ArrayRowLabel({ fields, fallback }: ArrayRowLabelProps) {
  const { data, rowNumber } = useRowLabel<RowData>()
  const title = rowTitle(data, fields)
  const number = String((rowNumber ?? 0) + 1).padStart(2, "0")
  return <span>{title || `${fallback} ${number}`}</span>
}
