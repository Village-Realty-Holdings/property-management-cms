"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ChevronDownIcon } from "lucide-react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

export type PickerItem = {
  value: string
  label: string
  /** Shown beside the label (a path, say). */
  detail?: string
  /** A picture or icon for the item. */
  preview?: ReactNode
}

/** Items whose label or detail contain every word of `query`. */
export function matchItems(
  items: readonly PickerItem[],
  query: string,
  limit: number
): { shown: PickerItem[]; total: number } {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const all = words.length
    ? items.filter((item) => {
        const text = `${item.label} ${item.detail ?? ""}`.toLowerCase()
        return words.every((word) => text.includes(word))
      })
    : items
  return { shown: all.slice(0, limit), total: all.length }
}

/**
 * A button that opens a searchable list and picks one item, or none. Used
 * where a native select would be too long to scan (Pages, icons).
 */
export function SearchPicker({
  id,
  value,
  items,
  label,
  valueText,
  trigger,
  searchLabel,
  noneLabel,
  disabled,
  limit = 50,
  onChange,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id: string
  /** The chosen item's value, or null. */
  value: string | null
  items: readonly PickerItem[]
  /** The field's label, and the choice in words: together the button's name. */
  label: string
  valueText: string
  /** What the button shows for the current choice. */
  trigger: ReactNode
  searchLabel: string
  /** Label of the option that clears the choice; omit when a choice is required. */
  noneLabel?: string
  disabled?: boolean
  /** The most items shown at once; the rest are reached by searching. */
  limit?: number
  onChange: (value: string | null) => void
  "aria-describedby"?: string
  "aria-invalid"?: true
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const { shown, total } = useMemo(
    () => matchItems(items, query, limit),
    [items, query, limit]
  )

  const pick = (next: string | null) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-label={`${label}: ${valueText}`}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className="flex h-(--input-height) w-full min-w-0 items-center justify-between gap-2 rounded-(--input-radius) border-(length:--input-border-width) border-input bg-transparent px-(--input-px) text-left text-sm shadow-(--input-shadow) outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {trigger}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-0 p-0">
        <Command shouldFilter={false} label={searchLabel}>
          <CommandInput
            placeholder={searchLabel}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Nothing matches “{query}”.</CommandEmpty>
            <CommandGroup>
              {noneLabel && query === "" && (
                <CommandItem
                  value="__none__"
                  data-checked={value === null}
                  onSelect={() => pick(null)}
                >
                  {noneLabel}
                </CommandItem>
              )}
              {shown.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  data-checked={item.value === value}
                  onSelect={() => pick(item.value)}
                >
                  {item.preview}
                  <span className="min-w-0 truncate">{item.label}</span>
                  {item.detail && (
                    <span className="ml-auto shrink-0 pr-5 text-xs text-muted-foreground">
                      {item.detail}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {total > shown.length && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
              Showing {shown.length} of {total}. Type to narrow the list.
            </p>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
