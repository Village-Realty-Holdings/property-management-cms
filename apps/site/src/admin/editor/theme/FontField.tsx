"use client"

import { useId } from "react"

import { Label } from "@workspace/ui/components/label"
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"

import { pickerFonts, type AvailableFont } from "../../../fonts/available"

/**
 * A font picker: the built-in quick picks, then the Site's stored Fonts. A
 * font the Theme already names stays in the list even when the picker would
 * hide it (a built-in a stored Font replaced) or the Site no longer has it,
 * so the control never shows a font the Theme is not using.
 */
export function FontField({
  label,
  value,
  fonts,
  onChange,
}: {
  label: string
  value: string
  fonts: readonly AvailableFont[]
  onChange: (key: string) => void
}) {
  const id = useId()
  const offered = pickerFonts(fonts)
  const inUse = offered.some((font) => font.key === value)
    ? undefined
    : fonts.find((font) => font.key === value)
  const missing = !inUse && !offered.some((font) => font.key === value)
  const builtIn = [...offered, ...(inUse ? [inUse] : [])].filter(
    (font) => font.source === "built-in"
  )
  const stored = offered.filter((font) => font.source === "stored")

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {missing && (
          <NativeSelectOption value={value}>
            Missing font (pick another)
          </NativeSelectOption>
        )}
        <NativeSelectOptGroup label="Built in">
          {builtIn.map((font) => (
            <NativeSelectOption key={font.key} value={font.key}>
              {font.family}
            </NativeSelectOption>
          ))}
        </NativeSelectOptGroup>
        {stored.length > 0 && (
          <NativeSelectOptGroup label="Your fonts">
            {stored.map((font) => (
              <NativeSelectOption key={font.key} value={font.key}>
                {font.family}
              </NativeSelectOption>
            ))}
          </NativeSelectOptGroup>
        )}
      </NativeSelect>
    </div>
  )
}
