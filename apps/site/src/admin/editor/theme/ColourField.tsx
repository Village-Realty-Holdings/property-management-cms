"use client"

import { useId, useState } from "react"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { normalizeHex } from "../../../theme"

/**
 * A colour control: a swatch that opens the browser's picker, and the hex as
 * text. Only a finished `#rgb` or `#rrggbb` is passed on, as lower-case
 * `#rrggbb`; leaving the field puts back the colour in use.
 */
export function ColourField({
  label,
  value,
  onChange,
  description,
}: {
  label: string
  value: string
  onChange: (hex: string) => void
  description?: string
}) {
  const id = useId()
  const [text, setText] = useState(value)
  const [seen, setSeen] = useState(value)
  // Follow the value when it is changed from outside (a preset, a fix, Undo),
  // but not while the typed text already means it: "#abc" is "#aabbcc".
  if (value !== seen) {
    setSeen(value)
    if (normalizeHex(text) !== value) setText(value)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={value}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
          className="size-(--input-height) shrink-0 cursor-pointer rounded-(--input-radius) border border-input bg-transparent p-0.5"
        />
        <Input
          id={id}
          value={text}
          spellCheck={false}
          autoComplete="off"
          aria-describedby={description ? `${id}-description` : undefined}
          className="font-mono"
          onChange={(event) => {
            setText(event.target.value)
            const hex = normalizeHex(event.target.value)
            if (hex) onChange(hex)
          }}
          onBlur={() => setText(value)}
        />
      </div>
      {description && (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
