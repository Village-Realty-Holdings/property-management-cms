import Link from "next/link"

import { buttonVariants } from "@workspace/ui/components/button"

import { safeHref } from "../RichText"

export type BlockLink = { label: string; href: string }
export type BlockButtonTone = "accent" | "primary"

/** A Block's button colour: the Theme's accent or primary colour. */
const variants = { accent: "accent", primary: "default" } as const

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
  className,
}: {
  link: BlockLink
  tone?: BlockButtonTone
  className?: string
}) {
  const classes = buttonVariants({
    variant: variants[tone],
    size: "lg",
    className,
  })
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
