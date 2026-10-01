import type { ReactNode } from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

import { isInternalHref, type BlockLink } from "./lib"

export type BlockButtonTone = "accent" | "primary" | "light" | "outline"

const tones: Record<BlockButtonTone, string> = {
  accent:
    "bg-(--brand-accent) text-(--brand-accent-foreground) focus-visible:ring-(--brand-accent)/50",
  primary:
    "bg-(--brand-primary) text-(--brand-primary-foreground) focus-visible:ring-(--brand-primary)/40",
  light: "bg-white text-neutral-900 focus-visible:ring-white/60",
  outline:
    "border border-current/35 hover:border-current hover:bg-current/10 focus-visible:ring-current/40",
}

/**
 * A CMS link group as a pill button: next/link for Site paths, a plain
 * anchor for external, mailto and tel links.
 */
export function BlockButton({
  link,
  tone = "accent",
  className,
  children,
}: {
  link: BlockLink
  tone?: BlockButtonTone
  className?: string
  children?: ReactNode
}) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0",
    tones[tone],
    className
  )
  const content = children ?? link.label
  if (isInternalHref(link.href)) {
    return (
      <Link href={link.href} className={classes}>
        {content}
      </Link>
    )
  }
  return (
    <a href={link.href} className={classes}>
      {content}
    </a>
  )
}
