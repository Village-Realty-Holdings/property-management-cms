import type { Field } from "payload"
import { toWords } from "payload/shared"

/**
 * What the Block tab reads from a Payload field's config: its label and
 * description, whether a condition shows it, and its default value.
 */

/** The data fields: the ones that have a name and a value. */
export type NamedField = Extract<Field, { name: string }>

/**
 * A `text` field is an icon picker (a Lucide icon, chosen by name) when it is
 * called `icon`, or when its config says `custom: { picker: "icon" }`.
 */
export const ICON_PICKER = { key: "picker", value: "icon" } as const

export function isIconField(field: Field): boolean {
  if (field.type !== "text") return false
  const custom = field.custom as Record<string, unknown> | undefined
  return (
    field.name === "icon" || custom?.[ICON_PICKER.key] === ICON_PICKER.value
  )
}

/** The label shown for a field; empty when its label is turned off. */
export function labelOf<T extends { name?: string; label?: unknown }>(
  field: T
): string {
  if (field.label === false) return ""
  if (typeof field.label === "string") return field.label
  return field.name ? toWords(field.name) : ""
}

/** The field's description when it is plain text. */
export function descriptionOf(field: Field): string | undefined {
  const admin = field.admin as { description?: unknown } | undefined
  return typeof admin?.description === "string" ? admin.description : undefined
}

type Condition = (
  data: Record<string, unknown>,
  siblingData: Record<string, unknown>,
  options: Record<string, unknown>
) => boolean

/**
 * Whether the field shows. `data` is the Block's values and `siblingData` the
 * values next to the field (its group's, its row's). A condition that throws
 * leaves the field shown: hiding a setting hides a bug.
 */
export function isVisible(
  field: Field,
  data: Record<string, unknown>,
  siblingData: Record<string, unknown>
): boolean {
  const admin = field.admin as
    | { hidden?: boolean; condition?: Condition }
    | undefined
  if (admin?.hidden) return false
  if (typeof admin?.condition !== "function") return true
  try {
    return admin.condition(data, siblingData, {
      blockData: data,
      user: undefined,
    })
  } catch {
    return true
  }
}

/** The value, or the field's default when the Block has none stored. */
export function valueOrDefault(field: Field, value: unknown): unknown {
  if (value !== undefined) return value
  return "defaultValue" in field && typeof field.defaultValue !== "function"
    ? field.defaultValue
    : undefined
}

/** Whether Users may not change the field. */
export const isReadOnly = (field: Field): boolean =>
  (field.admin as { readOnly?: boolean } | undefined)?.readOnly === true
