import type { Field } from "payload"

/**
 * Checks a value against its field's config: `required`, length, range and
 * row limits, then the field's own `validate`. Returns the first problem as
 * a sentence, or null. Payload's built-in validators need a request and
 * translations that the browser does not have, so the rules Staff Users can
 * trip over are written out here.
 */

export type ValidateContext = {
  /** The Block's values. */
  data: Record<string, unknown>
  /** The values next to the field. */
  siblingData: Record<string, unknown>
}

const REQUIRED = "This field is required."

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0)

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export function validateField(
  field: Field,
  value: unknown,
  { data, siblingData }: ValidateContext
): string | null {
  const required = "required" in field && field.required === true
  const builtIn = checkBuiltIn(field, value, required)
  if (builtIn) return builtIn

  if ("validate" in field && typeof field.validate === "function") {
    try {
      const result = (
        field.validate as (value: unknown, options: object) => unknown
      )(value, {
        data,
        siblingData,
        blockData: data,
        required,
        path: [],
        req: { t: (key: string) => key },
      })
      if (typeof result === "string") return result
    } catch {
      // A rule that needs the server can't run here; the save checks it.
    }
  }
  return null
}

function checkBuiltIn(
  field: Field,
  value: unknown,
  required: boolean
): string | null {
  switch (field.type) {
    case "text":
    case "textarea":
    case "email": {
      const text = typeof value === "string" ? value : ""
      if (required && text === "") return REQUIRED
      if (text === "") return null
      const { minLength, maxLength } = field as {
        minLength?: number
        maxLength?: number
      }
      if (maxLength != null && text.length > maxLength) {
        return `Use ${maxLength} characters or fewer. This has ${text.length}.`
      }
      if (minLength != null && text.length < minLength) {
        return `Use at least ${minLength} characters. This has ${text.length}.`
      }
      return null
    }
    case "number": {
      if (value === null || value === undefined || value === "") {
        return required ? REQUIRED : null
      }
      const n = Number(value)
      if (Number.isNaN(n)) return "Enter a number."
      if (field.min != null && n < field.min) {
        return `Use a number of ${field.min} or more.`
      }
      if (field.max != null && n > field.max) {
        return `Use a number of ${field.max} or less.`
      }
      return null
    }
    case "checkbox":
      return required && value !== true ? REQUIRED : null
    case "select":
    case "radio":
    case "upload":
    case "relationship":
      return required && isEmpty(value) ? REQUIRED : null
    case "array": {
      const rows = Array.isArray(value) ? value.length : 0
      if (required && rows === 0) return REQUIRED
      if (field.minRows != null && rows < field.minRows) {
        return `Add at least ${field.minRows} ${plural(field.minRows, "row", "rows")}. There ${plural(rows, "is", "are")} ${rows}.`
      }
      if (field.maxRows != null && rows > field.maxRows) {
        return `Use at most ${field.maxRows} ${plural(field.maxRows, "row", "rows")}. There ${plural(rows, "is", "are")} ${rows}.`
      }
      return null
    }
    default:
      return null
  }
}
