import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

import { safeHref } from "../RichText"

export type BlockLink = { label: string; href: string }
export type BlockButtonTone = "accent" | "primary"

const tones: Record<BlockButtonTone, string> = {
  accent:
    "bg-(--brand-accent) text-(--brand-accent-foreground) focus-visible:ring-(--brand-accent)/50",
  primary:
    "bg-(--brand-primary) text-(--brand-primary-foreground) focus-visible:ring-(--brand-primary)/40",
}

/** A link group (`{ label, href }`) when both are set and the href is safe. */
export function linkOf(
  value: { label?: string | null; href?: string | null } | null | undefined
): BlockLink | null {
  const label = value?.label?.trim()
  const href = safeHref(value?.href)
  return label && href ? { label, href } : null
}

/** A Block's link as a pill button: next/link for Site paths. */
export function BlockButton({
  link,
  tone = "accent",
  className,
}: {
  link: BlockLink
  tone?: BlockButtonTone
  className?: string
}) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0",
    tones[tone],
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
