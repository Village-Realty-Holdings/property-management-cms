import Link from "next/link"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { safeHref } from "../RichText"

export type BlockLink = { label: string; href: string }
export type BlockButtonTone = "accent" | "primary" | "onAccent"

/**
 * A Block's button colour: the Theme's accent or primary colour, or the
 * primary button drawn on the accent colour (`onAccent`), where an Outline
 * label in the link colour would not be readable.
 */
const variants = {
  accent: "accent",
  primary: "default",
  onAccent: "onAccent",
} as const

/** The coloured panel a Block button sits on; none means the page itself. */
export type BlockSurface = "primary" | "accent" | "dark"

/**
 * The focus ring of a button on a coloured panel. The Theme's --ring is the
 * primary colour, so the default ring (--ring at 50%) is invisible on a
 * primary panel. Here the ring is the panel's own text colour, set off from
 * the button by a gap in the panel colour, so it contrasts with the panel and
 * with the button. A panel's text colour is derived to pass AA on the panel,
 * which puts the ring above the 3:1 that WCAG 1.4.11 asks for on every Theme.
 * (Class names are written out so Tailwind can see them.)
 */
const focusRings: Record<BlockSurface, string> = {
  primary:
    "focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
  accent:
    "focus-visible:ring-accent-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-accent",
  dark: "focus-visible:ring-surface-dark-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark",
}

/**
 * The edge of a focused button on a panel: the button's own, not --ring
 * (which would turn an accent button's edge into the panel colour, or an
 * Outline edge into the link colour).
 */
const focusEdges: Record<BlockButtonTone, string> = {
  accent: "focus-visible:border-transparent",
  primary: "focus-visible:border-(--btn-border-color)",
  onAccent: "focus-visible:border-(--btn-on-accent-border-color)",
}

/** A link group (`{ label, href }`) when both are set and the href is safe. */
export function linkOf(
  value: { label?: string | null; href?: string | null } | null | undefined
): BlockLink | null {
  const label = value?.label?.trim()
  const href = safeHref(value?.href)
  return label && href ? { label, href } : null
}

/**
 * A Block's link as a Button: next/link for Site paths. Its corners, size,
 * weight and lift come from the Theme's button tokens, like every Button.
 */
export function BlockButton({
  link,
  tone = "accent",
  surface,
  className,
}: {
  link: BlockLink
  tone?: BlockButtonTone
  /** The coloured panel the button sits on, when it is not the page. */
  surface?: BlockSurface
  className?: string
}) {
  // cn drops the base ring and edge classes that the panel's replace.
  const classes = cn(
    buttonVariants({ variant: variants[tone], size: "lg" }),
    surface && [focusRings[surface], focusEdges[tone]],
    className
  )
  return link.href.startsWith("/") ? (
    <Link href={link.href} className={classes}>
      {link.label}
    </Link>
  ) : (
    <a href={link.href} className={classes}>
      {link.label}
    </a>
  )
}
