import Link from "next/link"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { safeHref } from "../RichText"
import { EditableText } from "./Editable"
import type { BlockContext } from "./types"

export type BlockLink = { label: string; href: string }
export type BlockButtonTone =
  | "accent"
  | "primary"
  | "onAccent"
  | "outline"
  | "inverse"

/**
 * A Block's button colour: the Theme's accent or primary colour, or the
 * primary button drawn on the accent colour (`onAccent`), where an Outline
 * label in the link colour would not be readable. `outline` and `inverse`
 * have no colour of their own (see `looks`).
 */
const variants = {
  accent: "accent",
  primary: "default",
  onAccent: "onAccent",
  outline: "ghost",
  inverse: "ghost",
} as const

/** A solid button's shadow and lift, from the Theme's button tokens. */
const solid =
  "shadow-(--btn-shadow) hover:-translate-y-(--btn-lift) motion-reduce:hover:translate-y-0"

/**
 * The two tones drawn from the surface they sit on, so they read on any of
 * them. `outline` is the surface's text colour as an edge and a label; its
 * edge is always drawn, whatever width the Theme gives its own button's.
 * `inverse` is that colour as the fill with the surface's colour as the
 * label, for a coloured surface, where the Theme's own button would be the
 * surface's colour or unreadable on it. Each is as readable as the surface's
 * text, which is derived to pass AA.
 */
const looks: Record<"outline", string> & {
  inverse: Record<BlockSurface, string>
} = {
  outline:
    "border-current bg-transparent hover:bg-current/10 hover:text-current dark:hover:bg-current/10",
  inverse: {
    primary: `bg-primary-foreground text-primary hover:bg-primary-foreground/90 hover:text-primary dark:hover:bg-primary-foreground/90 ${solid}`,
    accent: `bg-accent-foreground text-accent hover:bg-accent-foreground/90 hover:text-accent dark:hover:bg-accent-foreground/90 ${solid}`,
    dark: `bg-surface-dark-foreground text-surface-dark hover:bg-surface-dark-foreground/90 hover:text-surface-dark dark:hover:bg-surface-dark-foreground/90 ${solid}`,
  },
}

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
export const focusRings: Record<BlockSurface, string> = {
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
  outline: "focus-visible:border-current",
  inverse: "focus-visible:border-transparent",
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
  editable,
}: {
  link: BlockLink
  /** `inverse` needs a `surface`; without one it is the Theme's button. */
  tone?: BlockButtonTone
  /** The coloured panel the button sits on, when it is not the page. */
  surface?: BlockSurface
  className?: string
  /** Where the label is stored, so the Visual Editor can edit it in place. */
  editable?: { field: string; context: BlockContext }
}) {
  // cn drops the base ring and edge classes that the panel's replace.
  const drawn = tone === "inverse" && !surface ? "primary" : tone
  const classes = cn(
    buttonVariants({ variant: variants[drawn], size: "lg" }),
    drawn === "outline" && looks.outline,
    drawn === "inverse" && surface && looks.inverse[surface],
    surface && [focusRings[surface], focusEdges[drawn]],
    className
  )
  const label = editable ? (
    <EditableText field={editable.field} context={editable.context}>
      {link.label}
    </EditableText>
  ) : (
    link.label
  )
  return link.href.startsWith("/") ? (
    <Link href={link.href} className={classes}>
      {label}
    </Link>
  ) : (
    <a href={link.href} className={classes}>
      {label}
    </a>
  )
}
