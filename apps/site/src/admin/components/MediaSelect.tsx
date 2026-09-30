"use client"

import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"

export type MediaOption = { id: number; label: string; url: string | null }

/** Picks one Media image (or none), with a thumbnail of the choice. */
export function MediaSelect({
  id,
  value,
  options,
  onChange,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id: string
  value: number | null
  options: MediaOption[]
  onChange: (value: number | null) => void
  /** From `describedBy()`: the FormField's description and error. */
  "aria-describedby"?: string
  "aria-invalid"?: true
}) {
  const chosen = options.find((option) => option.id === value)
  return (
    <div className="flex items-center gap-3">
      {chosen?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={chosen.url}
          alt=""
          className="size-12 rounded-md border object-cover"
        />
      ) : (
        <div
          className="size-12 rounded-md border border-dashed bg-muted"
          aria-hidden
        />
      )}
      <NativeSelect
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className="w-full max-w-sm"
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : null)
        }
      >
        <NativeSelectOption value="">No image</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.id} value={option.id}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
