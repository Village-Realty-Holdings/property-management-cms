"use client"

import { useId, useState, type ReactNode } from "react"
import {
  MinusIcon,
  PawPrintIcon,
  PlusIcon,
  type LucideIcon,
} from "lucide-react"

import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

import { amenityIcon } from "./amenity-icon"
import { useBrowse } from "./browse-provider"
import type {
  BrowseOptions,
  FilterOption,
} from "@workspace/site-views/browse/options"
import {
  MAX_COUNT,
  activeFilterCount,
  clearedParams,
  sortOptions,
  toggle,
} from "@workspace/site-views/browse/params"

const BEDROOM_STEPS = [1, 2, 3, 4, 5]

function Group({
  legend,
  children,
  className,
}: {
  legend: string
  children: ReactNode
  className?: string
}) {
  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-3", className)}>
      <legend className="mb-3 text-sm font-semibold">{legend}</legend>
      {children}
    </fieldset>
  )
}

/** A toggle chip: pressed when the filter is on. */
function Chip({
  pressed,
  onToggle,
  icon: Icon,
  children,
}: {
  pressed: boolean
  onToggle: () => void
  icon?: LucideIcon
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none",
        pressed
          ? "border-(--brand-primary) bg-(--brand-primary) text-(--brand-primary-foreground)"
          : "border-border bg-background hover:border-foreground/40 hover:bg-muted"
      )}
    >
      {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
      {children}
    </button>
  )
}

function AmenityChips({
  amenities,
  selected,
  onToggle,
}: {
  amenities: FilterOption[]
  selected: string[]
  onToggle: (key: string) => void
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {amenities.map((amenity) => (
        <li key={amenity.id}>
          <Chip
            pressed={selected.includes(amenity.key)}
            onToggle={() => onToggle(amenity.key)}
            icon={amenityIcon(amenity.icon)}
          >
            {amenity.name}
          </Chip>
        </li>
      ))}
    </ul>
  )
}

/** A − n + stepper for a minimum; "Any" when unset. */
function MinStepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
}) {
  const current = value ?? 0
  const buttonClass =
    "inline-flex size-9 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        className={buttonClass}
        disabled={current === 0}
        onClick={() => onChange(current - 1 || null)}
        aria-label={`Fewer ${label}`}
      >
        <MinusIcon aria-hidden className="size-4" />
      </button>
      <output
        aria-live="polite"
        className="min-w-12 text-center text-base font-semibold tabular-nums"
      >
        {current === 0 ? "Any" : `${current}+`}
      </output>
      <button
        type="button"
        className={buttonClass}
        disabled={current >= MAX_COUNT}
        onClick={() => onChange(current + 1)}
        aria-label={`More ${label}`}
      >
        <PlusIcon aria-hidden className="size-4" />
      </button>
    </div>
  )
}

/** Segmented radios: Any, 1+, 2+ … */
function MinSegments({
  name,
  value,
  onChange,
}: {
  name: string
  value: number | null
  onChange: (value: number | null) => void
}) {
  const steps: (number | null)[] = [null, ...BEDROOM_STEPS]
  // A deep-linked value above the last step still shows as selected.
  if (value && !BEDROOM_STEPS.includes(value)) steps.push(value)
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(2.5rem,1fr))] gap-1.5">
      {steps.map((step) => {
        const checked = value === step
        return (
          <label
            key={step ?? "any"}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center justify-center rounded-full border px-2 text-sm font-medium tabular-nums transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 motion-reduce:transition-none",
              checked
                ? "border-(--brand-primary) bg-(--brand-primary) text-(--brand-primary-foreground)"
                : "border-border bg-background hover:bg-muted"
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={checked}
              onChange={() => onChange(step)}
            />
            {step === null ? "Any" : `${step}+`}
          </label>
        )
      })}
    </div>
  )
}

/**
 * Every /rentals filter. Rendered in the desktop sidebar and in the mobile
 * sheet; both drive the same URL through `useBrowse`.
 */
export function FilterFields({ options }: { options: BrowseOptions }) {
  const { params, update, replace } = useBrowse()
  const id = useId()
  const toggleAmenity = (key: string) =>
    update({ amenities: toggle(params.amenities, key) })
  const moreSelected = options.moreAmenities.some((a) =>
    params.amenities.includes(a.key)
  )
  // Opens once for a deep-linked extra Amenity; after that the guest decides.
  const [moreOpen, setMoreOpen] = useState(moreSelected)
  const count = activeFilterCount(params)
  // A deep-linked Location we don't list still shows as selected.
  const unknownLocation =
    params.location &&
    !options.locations.some((location) => location.key === params.location)

  return (
    <div className="flex flex-col gap-8">
      {(options.locations.length > 0 || params.location) && (
        <div className="flex flex-col gap-3">
          <label htmlFor={`${id}-location`} className="text-sm font-semibold">
            Where
          </label>
          <NativeSelect
            id={`${id}-location`}
            className="w-full [&_select]:h-10 [&_select]:text-base sm:[&_select]:text-sm"
            value={params.location ?? ""}
            onChange={(event) =>
              update({ location: event.target.value || null })
            }
          >
            <NativeSelectOption value="">Anywhere</NativeSelectOption>
            {options.locations.map((location) => (
              <NativeSelectOption key={location.id} value={location.key}>
                {`${"\u2003".repeat(location.depth)}${location.name}`}
              </NativeSelectOption>
            ))}
            {unknownLocation && (
              <NativeSelectOption value={params.location ?? ""}>
                Unknown place
              </NativeSelectOption>
            )}
          </NativeSelect>
        </div>
      )}

      <Group legend="Guests">
        <MinStepper
          label="guests"
          value={params.minSleeps}
          onChange={(minSleeps) => update({ minSleeps })}
        />
      </Group>

      <Group legend="Bedrooms">
        <MinSegments
          name={`${id}-bedrooms`}
          value={params.minBedrooms}
          onChange={(minBedrooms) => update({ minBedrooms })}
        />
      </Group>

      {(options.amenityFilters.length > 0 ||
        options.moreAmenities.length > 0) && (
        <Group legend="Amenities">
          {options.amenityFilters.length > 0 && (
            <AmenityChips
              amenities={options.amenityFilters}
              selected={params.amenities}
              onToggle={toggleAmenity}
            />
          )}
          {options.moreAmenities.length > 0 && (
            <details
              open={moreOpen}
              onToggle={(event) => setMoreOpen(event.currentTarget.open)}
              className="group/more"
            >
              <summary className="cursor-pointer rounded-sm text-sm font-medium text-muted-foreground underline-offset-4 select-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                {options.amenityFilters.length > 0
                  ? "More amenities"
                  : "Choose amenities"}
              </summary>
              <div className="pt-3">
                <AmenityChips
                  amenities={options.moreAmenities}
                  selected={params.amenities}
                  onToggle={toggleAmenity}
                />
              </div>
            </details>
          )}
        </Group>
      )}

      {options.propertyTypes.length > 0 && (
        <Group legend="Type of place">
          <ul className="flex flex-wrap gap-2">
            {options.propertyTypes.map((type) => (
              <li key={type.id}>
                <Chip
                  pressed={params.types.includes(type.key)}
                  onToggle={() =>
                    update({ types: toggle(params.types, type.key) })
                  }
                >
                  {type.name}
                </Chip>
              </li>
            ))}
          </ul>
        </Group>
      )}

      <div className="flex items-center justify-between gap-4">
        <label
          htmlFor={`${id}-pets`}
          className="flex cursor-pointer items-center gap-2 text-sm font-semibold"
        >
          <PawPrintIcon aria-hidden className="size-4 text-muted-foreground" />
          Pet friendly
        </label>
        <Switch
          id={`${id}-pets`}
          checked={params.pets}
          onCheckedChange={(pets) => update({ pets })}
          className="data-checked:bg-(--brand-primary)"
        />
      </div>

      {count > 0 && (
        <button
          type="button"
          onClick={() => replace(clearedParams(params))}
          className="self-start rounded-sm text-sm font-medium underline decoration-(--brand-accent) decoration-2 underline-offset-4 hover:decoration-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}

/** "Sort by" for the results. */
export function SortSelect({ className }: { className?: string }) {
  const { params, update } = useBrowse()
  const id = useId()
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label
        htmlFor={id}
        className="text-sm whitespace-nowrap text-muted-foreground"
      >
        Sort by
      </label>
      <NativeSelect
        id={id}
        value={params.sort}
        className="[&_select]:h-9"
        onChange={(event) =>
          update({
            sort: event.target.value as (typeof sortOptions)[number]["value"],
          })
        }
      >
        {sortOptions.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
