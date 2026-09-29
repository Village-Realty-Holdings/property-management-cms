import type { ReactNode } from "react"
import {
  CheckIcon,
  KeyRoundIcon,
  MapPinIcon,
  ReceiptTextIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"

import type {
  ComplexDetails as Details,
  RichText as Lexical,
} from "@workspace/content"
import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "@workspace/site-views/site/display"
import { RichText } from "@workspace/site-views/site/rich-text"

export type ComplexDetailsProps = {
  details: Details
  /** The Complex's name, for the heading. */
  name: string
  className?: string
}

function hasText(data: Lexical | null): data is Lexical {
  return !!data?.root?.children?.length
}

/** Whether a Complex has any detail to show. */
export function hasComplexDetails(details: Details | null): boolean {
  if (!details) return false
  return (
    !!details.address ||
    details.sharedAmenities.length > 0 ||
    hasText(details.checkInInfo) ||
    hasText(details.housekeeping) ||
    hasText(details.feeNotes)
  )
}

function Detail({
  icon: Icon,
  title,
  children,
  wide = false,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t-2 border-(--brand-accent) pt-4",
        wide && "sm:col-span-2"
      )}
    >
      <dt className="flex items-center gap-2 text-sm font-semibold">
        <Icon aria-hidden className="size-4 text-(--brand-primary)" />
        {title}
      </dt>
      <dd className="text-base leading-relaxed">{children}</dd>
    </div>
  )
}

/**
 * What a Complex shares across its rentals: address, shared amenities,
 * check-in, housekeeping and fee notes. Renders nothing when the Complex
 * has none of them.
 */
export function ComplexDetails({
  details,
  name,
  className,
}: ComplexDetailsProps) {
  const { address, sharedAmenities, checkInInfo, housekeeping, feeNotes } =
    details
  const notes = [
    { icon: KeyRoundIcon, title: "Check-in", data: checkInInfo },
    { icon: SparklesIcon, title: "Housekeeping", data: housekeeping },
    { icon: ReceiptTextIcon, title: "Fees", data: feeNotes },
  ].filter((note) => hasText(note.data))
  if (!hasComplexDetails(details)) return null

  return (
    <section
      aria-labelledby="complex-heading"
      className={cn(
        "flex flex-col gap-6 rounded-lg bg-muted/60 p-6 sm:p-8",
        className
      )}
    >
      <h2
        id="complex-heading"
        className={cn(displayFont, "text-3xl leading-tight text-balance")}
      >
        Staying at {name}
      </h2>
      <dl className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
        {address && (
          <Detail icon={MapPinIcon} title="Address" wide>
            <address className="whitespace-pre-line not-italic">
              {address}
            </address>
          </Detail>
        )}
        {sharedAmenities.length > 0 && (
          <Detail icon={CheckIcon} title="Shared amenities" wide>
            <ul className="flex flex-wrap gap-2">
              {sharedAmenities.map((amenity) => (
                <li
                  key={amenity.id}
                  className="rounded-full border border-border bg-background px-3 py-1 text-sm"
                >
                  {amenity.name}
                </li>
              ))}
            </ul>
          </Detail>
        )}
        {notes.map(({ icon, title, data }) => (
          <Detail key={title} icon={icon} title={title}>
            <RichText data={data} className="gap-3" />
          </Detail>
        ))}
      </dl>
    </section>
  )
}
