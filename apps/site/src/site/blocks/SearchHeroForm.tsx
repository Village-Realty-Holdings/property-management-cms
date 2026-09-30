"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { Toaster } from "@workspace/ui/components/sonner"

import { EditableText } from "./Editable"
import type { BlockContext } from "./types"

const labelClass = "text-sm font-medium"

/** What the toast plays back of the search, e.g. "2026-10-10 to 2026-10-14 · 2 guests · The Dunes". */
function summary(data: FormData): string {
  const value = (name: string) => String(data.get(name) ?? "").trim()
  const checkIn = value("checkIn")
  const checkOut = value("checkOut")
  const guests = value("guests")
  const location = value("location")
  return [
    checkIn && checkOut
      ? `${checkIn} to ${checkOut}`
      : (checkIn || checkOut) && `${checkIn || checkOut}`,
    guests && `${guests} ${guests === "1" ? "guest" : "guests"}`,
    location,
  ]
    .filter(Boolean)
    .join(" · ")
}

/**
 * The Search Hero's booking search, the only part of it that needs the
 * browser. It is visual-only: submitting shows a toast playing the search
 * back, and nothing is sent or navigated to. Field ids come from the Block's
 * position, not `useId`, so the Visual Editor's canvas and the Site draw the
 * same markup. The Toaster is mounted here, since the public Site has none.
 */
export function SearchHeroForm({
  searchLabel,
  locations,
  context,
}: {
  searchLabel: string
  locations: string[]
  context: Pick<BlockContext, "index" | "editing">
}) {
  const id = (field: string) => `block-${context.index}-search-${field}`
  const [checkIn, setCheckIn] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const searched = summary(new FormData(event.currentTarget))
    toast.info("This search is a preview", {
      description: searched
        ? `${searched}. No availability is checked yet.`
        : "No availability is checked yet.",
    })
  }

  return (
    <>
      <form
        onSubmit={submit}
        noValidate
        className="grid gap-4 rounded-(--card-radius) bg-card p-4 text-card-foreground shadow-(--card-shadow) sm:grid-cols-2 sm:p-6 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,0.7fr)_auto] lg:items-end"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={id("check-in")} className={labelClass}>
            Check-in date
          </label>
          <Input
            id={id("check-in")}
            name="checkIn"
            type="date"
            onChange={(event) => setCheckIn(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={id("check-out")} className={labelClass}>
            Check-out date
          </label>
          <Input
            id={id("check-out")}
            name="checkOut"
            type="date"
            min={checkIn || undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={id("location")} className={labelClass}>
            Location
          </label>
          {locations.length > 0 ? (
            <NativeSelect
              id={id("location")}
              name="location"
              defaultValue=""
              className="w-full"
            >
              <option value="">Any location</option>
              {locations.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <Input
              id={id("location")}
              name="location"
              type="text"
              placeholder="Anywhere"
            />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={id("guests")} className={labelClass}>
            Guests
          </label>
          <Input
            id={id("guests")}
            name="guests"
            type="number"
            min={1}
            max={30}
            defaultValue={2}
          />
        </div>
        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="sm:col-span-2 lg:col-span-1"
        >
          <EditableText field="searchLabel" context={context}>
            {searchLabel}
          </EditableText>
        </Button>
      </form>
      <Toaster position="bottom-center" />
    </>
  )
}
