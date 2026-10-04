import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import type { TrustStripBlock as TrustStripBlockData } from "../../payload-types"
import { imageOf } from "../brand"
import { displayFont } from "../display"
import { Icon } from "./Icon"
import { container, embeddedBox } from "./types"

/** What the strip is drawn on; the icons take the accent colour on the coloured ones. */
export type TrustSurface = "page" | "primary" | "dark"

export type TrustItem = {
  stat: string | null
  text: string
  icon: string | null
}
export type TrustLogo = { name: string; url: string }

type StoredItem = {
  stat?: string | null
  text?: string | null
  icon?: string | null
}

/** The items worth showing: those with text, their stat trimmed to null when blank. */
export function trustItemsOf(
  items: readonly StoredItem[] | null | undefined
): TrustItem[] {
  return (items ?? []).flatMap((item) => {
    const text = item.text?.trim()
    return text
      ? [{ stat: item.stat?.trim() || null, text, icon: item.icon ?? null }]
      : []
  })
}

/** The logos worth showing: those with a picture, named by their partner. */
export function trustLogosOf(logos: TrustStripBlockData["logos"]): TrustLogo[] {
  return (logos ?? []).flatMap((logo) => {
    const image = imageOf(logo.image)
    const name = logo.name?.trim() || image?.alt.trim()
    return image && name ? [{ name, url: image.url }] : []
  })
}

/**
 * A row of text or stat items: an icon (decorative), a stat set in the
 * display face when there is one, and the text. `inset` holds the row at page
 * width with its own padding, for where it is not inside a Block section.
 */
export function TrustItems({
  items,
  surface = "page",
  label,
  inset,
}: {
  items: TrustItem[]
  surface?: TrustSurface
  /** Names the list, when no heading does. */
  label?: string
  inset?: boolean
}) {
  return (
    <div className={cn(inset && [container, embeddedBox])}>
      <ul
        aria-label={label}
        className={cn(
          "grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]",
          inset && "py-6"
        )}
      >
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-3">
            <Icon
              name={item.icon}
              className={cn(
                "size-6 shrink-0",
                surface === "page" ? "text-primary" : "text-accent"
              )}
            />
            <span className="flex flex-wrap items-baseline gap-x-2">
              {item.stat && (
                <strong className={cn(displayFont, "text-2xl leading-none")}>
                  {item.stat}
                </strong>
              )}
              <span className="text-base">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A row of partner logos, each named by its partner. Partners supply their
 * logos for a light page, so on the coloured surfaces each sits on a card
 * tile, where it stays legible whatever the Theme's colours are.
 */
export function TrustLogos({
  logos,
  label,
  surface = "page",
}: {
  logos: TrustLogo[]
  label?: string
  surface?: TrustSurface
}) {
  const tiled = surface !== "page"
  return (
    <ul
      aria-label={label}
      className={cn(
        "flex flex-wrap items-center",
        tiled ? "gap-4" : "gap-x-12 gap-y-6"
      )}
    >
      {logos.map((logo, i) => (
        <li
          key={i}
          className={cn(
            "flex items-center",
            tiled && "rounded-(--card-radius) bg-card px-5 py-3"
          )}
        >
          <Image
            src={logo.url}
            alt={logo.name}
            width={160}
            height={48}
            className="h-10 w-auto max-w-40 object-contain"
          />
        </li>
      ))}
    </ul>
  )
}
