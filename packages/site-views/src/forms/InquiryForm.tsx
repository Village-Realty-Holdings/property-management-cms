"use client"

import { useState } from "react"
import Link from "next/link"
import { UsersIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "../site/display"
import { FeedImage } from "../site/feed-image"
import { propertyHref } from "../site/property-card"

import type { InquiryProperty } from "./actions"
import { ContactFields, TextAreaField, TextField } from "./fields"
import { SubmissionForm } from "./SubmissionForm"

export type InquiryFormProps = {
  /**
   * The Property's slug (from `?property=`). Sent with the form; the server
   * looks the Property up again, so a stale or unknown slug is harmless.
   */
  propertySlug?: string | null
  /** The Property's details for the "Enquiring about" card, once known. */
  property?: InquiryProperty | null
  submitLabel?: string
  successMessage?: string
  className?: string
}

/**
 * A booking inquiry: dates, guests and a message, optionally about one
 * Property. Stored as an `inquiry` Submission linked to that Property.
 */
export function InquiryForm({
  propertySlug,
  property,
  submitLabel = "Send inquiry",
  successMessage = "Thanks for your inquiry. We'll check availability and reply by email as soon as we can.",
  className,
}: InquiryFormProps) {
  const [arrival, setArrival] = useState("")
  const slug = property?.slug ?? propertySlug ?? null

  return (
    <SubmissionForm
      kind="inquiry"
      submitLabel={submitLabel}
      successMessage={successMessage}
      className={className}
    >
      {(formId, state) => (
        <>
          {property && <PropertyNote property={property} />}
          {slug && <input type="hidden" name="property" value={slug} />}
          <ContactFields formId={formId} state={state} />
          <fieldset className="grid gap-5 sm:grid-cols-[1fr_1fr_8rem]">
            <legend className="sr-only">Your stay</legend>
            <TextField
              formId={formId}
              state={state}
              name="arrival"
              label="Arrival"
              optional
              inputProps={{
                type: "date",
                onChange: (event) => setArrival(event.currentTarget.value),
              }}
            />
            <TextField
              formId={formId}
              state={state}
              name="departure"
              label="Departure"
              optional
              inputProps={{
                type: "date",
                min: (arrival || state.values.arrival) ?? undefined,
              }}
            />
            <TextField
              formId={formId}
              state={state}
              name="guests"
              label="Guests"
              optional
              inputProps={{
                type: "number",
                inputMode: "numeric",
                min: 1,
                max: property?.sleeps ?? 99,
                step: 1,
              }}
            />
          </fieldset>
          <TextAreaField
            formId={formId}
            state={state}
            name="message"
            label="Message"
            optional
            placeholder="Flexible dates, pets, early check-in…"
            rows={4}
          />
        </>
      )}
    </SubmissionForm>
  )
}

/** Which Property the inquiry is about, with a link back to it. */
function PropertyNote({ property }: { property: InquiryProperty }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/60 p-3">
      <FeedImage
        image={property.image}
        alt=""
        aspect="1/1"
        sizes="80px"
        className="w-16 shrink-0 rounded-md sm:w-20"
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm text-muted-foreground">Enquiring about</p>
        <Link
          href={propertyHref(property)}
          className={cn(
            displayFont,
            "text-lg leading-snug text-pretty underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none sm:text-xl"
          )}
        >
          {property.name}
        </Link>
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
          {property.location && <span>{property.location}</span>}
          {property.sleeps != null && (
            <span className="inline-flex items-center gap-1">
              <UsersIcon aria-hidden className="size-3.5" />
              Sleeps {property.sleeps}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
