import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

import type { Background } from "../../fields/background"
import {
  container,
  embeddedBand,
  embeddedBox,
  sectionY,
  type BlockContext,
} from "./types"

/**
 * What each background paints: the Theme's own tokens, with the text colour
 * derived to pass AA on it. (Class names are written out so Tailwind can see
 * them.)
 */
export const surfaces: Record<Background, string> = {
  default: "bg-background text-foreground",
  muted: "bg-muted text-foreground",
  primary: "bg-primary text-primary-foreground",
  dark: "bg-surface-dark text-surface-dark-foreground",
}

/** The Block's background, `default` when unset or not one the Theme knows. */
export function backgroundOf(value: string | null | undefined): Background {
  return value && Object.hasOwn(surfaces, value)
    ? (value as Background)
    : "default"
}

/**
 * The surface a Block is drawn for: the Container's when it is inside one,
 * else its own background.
 */
export function surfaceOf(
  background: string | null | undefined,
  context: Pick<BlockContext, "surface">
): Background {
  return context.surface ?? backgroundOf(background)
}

/**
 * A Block's section: full-bleed on its background, padded by the Theme's
 * --section-y, its content held at page width. Inside a Container it is
 * none of those: the Container paints, pads and holds the width. The section
 * is a named region: by the heading it is `labelledBy`, or by a `label`.
 */
export function BlockSection({
  background,
  labelledBy,
  label,
  className,
  children,
}: {
  background?: string | null
  labelledBy?: string
  label?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      className={cn(surfaces[backgroundOf(background)], sectionY, embeddedBand)}
    >
      <div className={cn(container, embeddedBox, className)}>{children}</div>
    </section>
  )
}
