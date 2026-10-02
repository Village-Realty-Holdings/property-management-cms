import Image from "next/image"
import { MapPin } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import type { LocationBlock as LocationBlockData } from "../../payload-types"
import { imageOf } from "../brand"
import { displayFont } from "../display"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import type { BlockContext } from "./types"

/**
 * A link that opens the address in a maps app. It is a plain link, not an
 * embed: nothing is loaded from another site until a visitor follows it.
 */
export function directionsUrl(address: string): string {
  const query = address
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  return `https://www.google.com/maps/dir/?${new URLSearchParams({
    api: "1",
    destination: query.join(", "),
  })}`
}

/**
 * A map drawn by the Site: streets, blocks and water in the Theme's own
 * tokens, and a pin. It shows no real place, so it is decorative (hidden from
 * assistive technology); the address and the directions link carry the
 * meaning.
 */
function MapCard() {
  return (
    <div
      aria-hidden
      data-map="card"
      className="relative aspect-[4/3] overflow-hidden rounded-(--card-radius) bg-muted shadow-(--card-shadow)"
    >
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        focusable="false"
      >
        <path
          d="M0 232 C70 208 130 252 200 232 S330 204 400 236 V300 H0 Z"
          className="fill-primary/25"
        />
        <g className="fill-border">
          <rect x="34" y="40" width="74" height="52" rx="6" />
          <rect x="246" y="34" width="92" height="62" rx="6" />
          <rect x="294" y="116" width="74" height="44" rx="6" />
          <rect x="60" y="120" width="62" height="40" rx="6" />
          <rect x="150" y="166" width="70" height="34" rx="6" />
        </g>
        <g
          fill="none"
          strokeLinecap="round"
          className="stroke-card"
          strokeWidth="9"
        >
          <path d="M-10 110 L190 98 L410 120" />
          <path d="M190 98 L206 196" />
          <path d="M120 -10 L130 312" />
          <path d="M276 -10 L290 312" />
        </g>
      </svg>
      <MapPin
        strokeWidth={1.75}
        className="absolute top-[30%] left-1/2 size-14 -translate-x-1/2 fill-accent text-primary drop-shadow"
      />
    </div>
  )
}

/** The panel a Block's link sits on, for its focus ring (see BlockButton). */
const focusRing: Record<string, string> = {
  primary:
    "focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
  dark: "focus-visible:ring-surface-dark-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark",
}

/**
 * Location: an address, some text, and a map. The map is the picture the
 * Block names, or a card drawn by the Site (also used when the Block asks for
 * a picture and has none). Nothing is embedded.
 */
export function LocationBlock({
  block,
  context,
}: {
  block: LocationBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const id = `block-${context.index}-heading`
  const address = block.address?.trim() ?? ""
  const text = block.text?.trim()
  const mapImage = block.map === "image" ? imageOf(block.mapImage) : null

  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={id}
      className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
    >
      <div className="flex flex-col items-start gap-5">
        <EditableText
          as="h2"
          field="heading"
          context={context}
          id={id}
          className={cn(displayFont, "text-3xl text-balance sm:text-4xl")}
        >
          {heading}
        </EditableText>
        {address && (
          <address className="text-lg not-italic">
            <EditableText
              field="address"
              context={context}
              multiline
              className="block whitespace-pre-line"
            >
              {address}
            </EditableText>
          </address>
        )}
        {text && (
          <EditableText
            as="p"
            field="text"
            context={context}
            multiline
            className="max-w-prose text-pretty whitespace-pre-line"
          >
            {text}
          </EditableText>
        )}
        {address && (
          <a
            href={directionsUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "accent", size: "lg" }),
              focusRing[surfaceOf(block.background, context)]
            )}
          >
            Get directions
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
      {mapImage ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-(--card-radius) bg-muted shadow-(--card-shadow)">
          <Image
            src={mapImage.url}
            alt={mapImage.alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <MapCard />
      )}
    </BlockSection>
  )
}
