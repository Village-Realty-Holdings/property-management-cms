"use client"

import { useFormFields } from "@payloadcms/ui"

type CharacterCountProps = {
  /** Path of the text field, passed by Payload to `afterInput` components. */
  path: string
  /** Recommended maximum length; longer text still saves. */
  max: number
}

/**
 * Live character count under a text or textarea field, against a
 * recommended maximum (search engines cut SEO titles and descriptions off
 * beyond it). Advisory only: it never blocks a save.
 */
export function CharacterCount({ path, max }: CharacterCountProps) {
  const value = useFormFields(([fields]) => fields[path]?.value)
  const count = typeof value === "string" ? value.length : 0
  const over = count > max

  return (
    <div
      aria-live="polite"
      style={{
        marginTop: "calc(var(--base) / 4)",
        fontSize: "0.8125rem",
        color: over ? "var(--theme-error-500)" : "var(--theme-elevation-500)",
      }}
    >
      {count} / {max} characters
      {over ? " — may be cut off in search results" : ""}
    </div>
  )
}
