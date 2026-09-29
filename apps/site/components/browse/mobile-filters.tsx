"use client"

import { useRef, useState, type CSSProperties } from "react"
import { SlidersHorizontalIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

import { displayFont } from "@workspace/site-views/site/display"

import { useBrowse } from "./browse-provider"
import { FilterFields } from "./filter-fields"
import type { BrowseOptions } from "@workspace/site-views/browse/options"
import { activeFilterCount } from "@workspace/site-views/browse/params"

/**
 * The Site's theme variables (brand colours, fonts) from the nearest themed
 * ancestor. The sheet renders in a portal outside that wrapper, so it needs
 * them copied onto itself to match the Site.
 */
function themeVarsFrom(element: Element | null): CSSProperties {
  const themed = element?.closest<HTMLElement>('[style*="--brand-primary"]')
  if (!themed) return {}
  const vars: Record<string, string> = {}
  for (const name of Array.from(themed.style)) {
    if (name.startsWith("--")) vars[name] = themed.style.getPropertyValue(name)
  }
  return vars as CSSProperties
}

/**
 * Phones and tablets: a "Filters" button opening the filters in a bottom
 * sheet. Changes apply as they're made; the footer button shows the new
 * count and closes the sheet.
 */
export function MobileFilters({
  options,
  total,
}: {
  options: BrowseOptions
  /** Results for the current filters. */
  total: number
}) {
  const { params, pending } = useBrowse()
  const count = activeFilterCount(params)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [themeVars, setThemeVars] = useState<CSSProperties>({})
  return (
    <Sheet
      onOpenChange={(open) => {
        if (open) setThemeVars(themeVarsFrom(triggerRef.current))
      }}
    >
      <SheetTrigger
        ref={triggerRef}
        render={
          <Button
            variant="outline"
            size="lg"
            className="h-10 rounded-full px-4"
          />
        }
      >
        <SlidersHorizontalIcon data-icon="inline-start" aria-hidden />
        Filters
        {count > 0 && (
          <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-(--brand-primary) text-xs font-semibold text-(--brand-primary-foreground) tabular-nums">
            {count}
            <span className="sr-only"> set</span>
          </span>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        style={themeVars}
        className="max-h-[88svh] gap-0 rounded-t-2xl bg-background font-sans text-foreground"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className={`${displayFont} text-2xl`}>Filters</SheetTitle>
          <SheetDescription>Results update as you choose.</SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto overscroll-contain px-5 py-6">
          <FilterFields options={options} />
        </div>
        <SheetFooter className="border-t border-border px-5 py-4">
          <SheetClose
            render={
              <Button
                size="lg"
                className="h-11 w-full rounded-full bg-(--brand-primary) text-base text-(--brand-primary-foreground) hover:bg-(--brand-primary)/90"
              />
            }
          >
            {pending
              ? "Updating…"
              : total === 0
                ? "No rentals match"
                : `Show ${total} ${total === 1 ? "rental" : "rentals"}`}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
