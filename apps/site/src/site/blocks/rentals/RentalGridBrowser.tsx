"use client"

import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Toggle } from "@workspace/ui/components/toggle"
import { cn } from "@workspace/ui/lib/utils"

import type { Rental } from "../../fixtures/types"
import {
  bedroomOptions,
  browse,
  locationOptions,
  noFilters,
  type GridState,
  type SortKey,
} from "./grid"
import { RentalCardGrid } from "./RentalCardGrid"
import { RentalsEmpty } from "./RentalsEmpty"

const sorts: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name (A to Z)" },
  { key: "sleeps", label: "Sleeps (most first)" },
  { key: "rating", label: "Rating (best first)" },
]

const isSortKey = (value: string): value is SortKey =>
  sorts.some((sort) => sort.key === value)

const initial: GridState = { ...noFilters, sort: "name", page: 1 }

/** A filter chip: a toggle button that says whether it is on. */
function Chip({
  pressed,
  onPressedChange,
  children,
}: {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children: string
}) {
  return (
    <Toggle
      variant="outline"
      size="sm"
      pressed={pressed}
      onPressedChange={onPressedChange}
      className="border-current/40 text-inherit hover:text-foreground aria-pressed:border-transparent aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground aria-pressed:hover:text-background"
    >
      {children}
    </Toggle>
  )
}

function ChipGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {children}
    </div>
  )
}

/**
 * The Rental grid's browsing part, the only part of it that needs the
 * browser: filter chips (bedrooms, pets, location), a sort, the cards, a
 * live result count and Previous/Next. Every choice is held in state, so a
 * visitor's filters are never in the URL. Changing a filter or the sort goes
 * back to page one. Element ids come from the Block's position, so the Site
 * and the Visual Editor's canvas draw the same markup.
 */
export function RentalGridBrowser({
  rentals,
  pageSize,
  sortId,
  label,
}: {
  rentals: readonly Rental[]
  pageSize: number | null | undefined
  /** The id of the sort control, from the Block's place. */
  sortId: string
  /** Names the pagination and the result count, e.g. the Block's heading. */
  label: string
}) {
  const [state, setState] = useState<GridState>(initial)
  if (rentals.length === 0) return <RentalsEmpty />

  const change = (next: Partial<GridState>) =>
    setState((current) => ({ ...current, ...next, page: 1 }))
  const view = browse(rentals, state, pageSize)
  const bedrooms = bedroomOptions(rentals)
  const towns = locationOptions(rentals)
  const townKey = (town: string) => town.toLowerCase()
  const filtered =
    state.minBedrooms !== null ||
    state.petFriendly ||
    state.locations.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {bedrooms.length > 0 && (
            <ChipGroup label="Bedrooms">
              {bedrooms.map((count) => (
                <Chip
                  key={count}
                  pressed={state.minBedrooms === count}
                  onPressedChange={(on) =>
                    change({ minBedrooms: on ? count : null })
                  }
                >
                  {`${count}+ bedrooms`}
                </Chip>
              ))}
            </ChipGroup>
          )}
          <ChipGroup label="Pets">
            <Chip
              pressed={state.petFriendly}
              onPressedChange={(on) => change({ petFriendly: on })}
            >
              Pets welcome
            </Chip>
          </ChipGroup>
          {towns.length > 0 && (
            <ChipGroup label="Location">
              {towns.map((town) => (
                <Chip
                  key={town}
                  pressed={state.locations.some(
                    (chosen) => townKey(chosen) === townKey(town)
                  )}
                  onPressedChange={(on) =>
                    change({
                      locations: on
                        ? [...state.locations, town]
                        : state.locations.filter(
                            (chosen) => townKey(chosen) !== townKey(town)
                          ),
                    })
                  }
                >
                  {town}
                </Chip>
              ))}
            </ChipGroup>
          )}
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => change(noFilters)}
              className="underline underline-offset-4"
            >
              Clear filters
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={sortId} className="text-sm font-medium">
            Sort by
          </label>
          <NativeSelect
            id={sortId}
            value={state.sort}
            onChange={(event) => {
              const value = event.currentTarget.value
              if (isSortKey(value)) change({ sort: value })
            }}
          >
            {sorts.map((sort) => (
              <NativeSelectOption key={sort.key} value={sort.key}>
                {sort.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <p role="status" aria-atomic className="text-sm">
        {view.total === 0
          ? "No rentals match"
          : `Showing ${view.first}–${view.last} of ${view.total} ${view.total === 1 ? "rental" : "rentals"}`}
      </p>

      {view.total === 0 ? (
        <RentalsEmpty filtered />
      ) : (
        <RentalCardGrid rentals={view.items} />
      )}

      {view.pageCount > 1 && (
        <nav
          aria-label={`${label} pages`}
          className="flex items-center justify-center gap-4"
        >
          <PageButton
            disabled={view.page <= 1}
            onClick={() => setState((c) => ({ ...c, page: view.page - 1 }))}
          >
            Previous
          </PageButton>
          <span className="text-sm">
            Page {view.page} of {view.pageCount}
          </span>
          <PageButton
            disabled={view.page >= view.pageCount}
            onClick={() => setState((c) => ({ ...c, page: view.page + 1 }))}
          >
            Next
          </PageButton>
        </nav>
      )}
    </div>
  )
}

/** Previous or Next. At the end it stays a tab stop but does nothing. */
function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean
  onClick: () => void
  children: string
}) {
  return (
    <Button
      variant="outline"
      disabled={disabled}
      focusableWhenDisabled
      onClick={onClick}
      className={cn(disabled && "pointer-events-none opacity-50")}
    >
      {children}
    </Button>
  )
}
