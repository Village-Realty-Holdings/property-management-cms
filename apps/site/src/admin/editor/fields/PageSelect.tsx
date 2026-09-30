"use client"

import { useMemo } from "react"

import type { PageOption } from "./context"
import { SearchPicker, type PickerItem } from "./SearchPicker"

/** Picks one Page (or none) by searching its title or path. */
export function PageSelect({
  id,
  label,
  value,
  pages,
  required,
  disabled,
  onChange,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id: string
  label: string
  value: number | null
  pages: readonly PageOption[]
  required?: boolean
  disabled?: boolean
  onChange: (value: number | null) => void
  "aria-describedby"?: string
  "aria-invalid"?: true
}) {
  const items = useMemo<PickerItem[]>(
    () =>
      pages.map((page) => ({
        value: String(page.id),
        label: page.title || page.path,
        detail: page.title ? page.path : undefined,
      })),
    [pages]
  )
  const chosen = pages.find((page) => page.id === value)
  return (
    <SearchPicker
      id={id}
      value={value === null ? null : String(value)}
      items={items}
      label={label}
      valueText={
        value === null
          ? "none"
          : chosen
            ? chosen.title || chosen.path
            : `Page #${value}`
      }
      searchLabel="Search Pages"
      noneLabel={required ? undefined : "No Page"}
      disabled={disabled}
      limit={200}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      onChange={(next) => onChange(next === null ? null : Number(next))}
      trigger={
        value === null ? (
          <span className="text-muted-foreground">Choose a Page</span>
        ) : chosen ? (
          <>
            <span className="truncate">{chosen.title || chosen.path}</span>
            {chosen.title && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {chosen.path}
              </span>
            )}
          </>
        ) : (
          <span>Page #{value}</span>
        )
      }
    />
  )
}
