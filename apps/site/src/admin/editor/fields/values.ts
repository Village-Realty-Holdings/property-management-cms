import type { Field } from "payload"
import { fieldAffectsData } from "payload/shared"

/** One step of a path: a field name, or a row's position in an array. */
export type Segment = string | number

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

/** The value at `path`, or undefined when the path leads nowhere. */
export function getAt(root: unknown, path: readonly Segment[]): unknown {
  let node = root
  for (const segment of path) {
    if (!isObject(node)) return undefined
    node = (node as Record<Segment, unknown>)[segment]
  }
  return node
}

const exists = (node: unknown, segment: Segment) =>
  Array.isArray(node)
    ? Number.isInteger(segment) && (segment as number) < node.length
    : isObject(node) && Object.hasOwn(node, segment)

/** `current` with `value` set at `rest`, creating what is missing. */
function assign(
  current: unknown,
  rest: readonly Segment[],
  value: unknown
): unknown {
  const [head, ...tail] = rest
  if (head === undefined) return value
  const base: Record<Segment, unknown> = Array.isArray(current)
    ? ([...current] as unknown as Record<Segment, unknown>)
    : isObject(current)
      ? { ...current }
      : typeof head === "number"
        ? ([] as unknown as Record<Segment, unknown>)
        : {}
  base[head] = assign(base[head], tail, value)
  return base
}

/**
 * The edit that puts `value` at `path` in the editor's document. The
 * document's `setField` only writes to a field that already exists, and a
 * Block stored without an optional field (or a whole group) has no such key.
 * So the edit is made at the deepest parent that does exist, with what is
 * missing filled in. A field that exists is written to directly, so typing
 * in it still joins one undo step.
 */
export function planWrite(
  doc: unknown,
  path: readonly Segment[],
  value: unknown
): { path: string; value: unknown } {
  let node = doc
  let known = 0
  while (known < path.length && exists(node, path[known]!)) {
    node = (node as Record<Segment, unknown>)[path[known]!]
    known++
  }
  return {
    path: path.slice(0, known).join("."),
    value: assign(node, path.slice(known), value),
  }
}

/** A field that only lays out other fields (a row, a collapsible). */
const layoutFields = (field: Field): Field[] | null =>
  !fieldAffectsData(field) && "fields" in field
    ? (field.fields as Field[])
    : null

/** The value a field starts with when it has none: its default, else empty. */
function startingValue(field: Field): unknown {
  if (!fieldAffectsData(field)) return undefined
  if ("defaultValue" in field && typeof field.defaultValue !== "function") {
    if (field.defaultValue !== undefined) return field.defaultValue
  }
  switch (field.type) {
    case "text":
    case "textarea":
    case "email":
    case "select":
    case "radio":
      return ""
    case "checkbox":
      return false
    case "number":
    case "upload":
    case "relationship":
      return null
    case "array":
      return []
    case "group":
      return emptyRowFor(field.fields)
    default:
      return undefined
  }
}

/** A new row (or group) for `fields`: every field has its default or an empty value. */
export function emptyRowFor(fields: readonly Field[]): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const field of fields) {
    if (fieldAffectsData(field)) {
      const value = startingValue(field)
      if (value !== undefined) row[field.name] = value
    } else {
      const inner = layoutFields(field)
      if (inner) Object.assign(row, emptyRowFor(inner))
    }
  }
  return row
}
