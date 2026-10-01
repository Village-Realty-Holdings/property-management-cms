"use client"

import { useField } from "@payloadcms/ui"
import type { TextFieldClientProps } from "payload"

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** `#abc` → `#aabbcc`: `<input type="color">` only takes six digits. */
function toSixDigits(hex: string): string {
  if (hex.length !== 4) return hex.toLowerCase()
  return `#${[...hex.slice(1)].map((c) => c + c).join("")}`.toLowerCase()
}

/**
 * A live preview of a branding colour, shown after the hex input
 * (`admin.components.afterInput`). Clicking it opens the browser's colour
 * picker, which writes the hex back into the field.
 */
export function ColorSwatch({ path, readOnly }: TextFieldClientProps) {
  const { disabled, setValue, value } = useField<string>({
    potentiallyStalePath: path,
  })
  const valid = typeof value === "string" && HEX_COLOR.test(value)
  const locked = Boolean(readOnly || disabled)

  return (
    <label
      title={valid ? `Preview of ${value}` : "No colour set"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        marginTop: "0.5rem",
        position: "relative",
        cursor: locked ? "default" : "pointer",
        fontSize: "0.8125rem",
        color: "var(--theme-elevation-500)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: "1.75rem",
          height: "1.75rem",
          borderRadius: "var(--style-radius-s, 4px)",
          border: "1px solid var(--theme-elevation-150)",
          background: valid
            ? value
            : "repeating-conic-gradient(var(--theme-elevation-100) 0% 25%, transparent 0% 50%) 50% / 10px 10px",
          flexShrink: 0,
        }}
      />
      {locked ? (valid ? "Preview" : "No colour set") : "Pick a colour"}
      <input
        type="color"
        aria-label="Pick a colour"
        disabled={locked}
        value={valid ? toSixDigits(value) : "#000000"}
        onChange={(event) => setValue(event.target.value)}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </label>
  )
}
