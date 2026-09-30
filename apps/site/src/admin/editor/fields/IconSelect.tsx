"use client"

import { useMemo } from "react"
import { DynamicIcon, iconNames } from "lucide-react/dynamic"

import { SearchPicker, type PickerItem } from "./SearchPicker"

type IconName = (typeof iconNames)[number]

const preview = (name: string) => (
  <DynamicIcon
    name={name as IconName}
    aria-hidden
    className="size-4 shrink-0"
    fallback={() => <span className="size-4 shrink-0" aria-hidden />}
  />
)

const titleOf = (name: string) => name.replaceAll("-", " ")

/**
 * Picks a Lucide icon by name. The list is searched by name, and only the
 * icons shown are drawn, so it stays quick with every icon to choose from.
 */
export function IconSelect({
  id,
  label,
  value,
  required,
  disabled,
  onChange,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id: string
  label: string
  value: string
  required?: boolean
  disabled?: boolean
  onChange: (value: string) => void
  "aria-describedby"?: string
  "aria-invalid"?: true
}) {
  const items = useMemo<PickerItem[]>(
    () =>
      iconNames.map((name) => ({
        value: name,
        label: titleOf(name),
        preview: preview(name),
      })),
    []
  )
  return (
    <SearchPicker
      id={id}
      value={value || null}
      items={items}
      label={label}
      valueText={value ? titleOf(value) : "none"}
      searchLabel="Search icons"
      noneLabel={required ? undefined : "No icon"}
      disabled={disabled}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      onChange={(next) => onChange(next ?? "")}
      trigger={
        value ? (
          <>
            {preview(value)}
            <span className="truncate">{titleOf(value)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Choose an icon</span>
        )
      }
    />
  )
}
