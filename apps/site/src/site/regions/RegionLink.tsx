import type { ComponentPropsWithoutRef } from "react"
import Link from "next/link"

/**
 * The focus outline of a link, by the surface it sits on. The Theme's
 * --ring is the primary colour, which would vanish on a primary strip, so
 * the strip and the footer outline in their own text colour, which the Theme
 * derives to pass AA on them. (Class names are written out so Tailwind can
 * see them.)
 */
export const focusOutline = {
  page: "outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring",
  primary:
    "outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary-foreground",
  /** In the text colour of whatever it sits on. */
  current:
    "outline-offset-2 focus-visible:outline-2 focus-visible:outline-current",
  secondary:
    "outline-offset-2 focus-visible:outline-2 focus-visible:outline-secondary-foreground",
} as const

/**
 * A link in a region: next/link for a Site path, a plain anchor for anything
 * else (a full URL, mailto:, tel: or a same-page anchor).
 */
export function RegionLink({
  href,
  children,
  ...rest
}: Omit<ComponentPropsWithoutRef<"a">, "href"> & { href: string }) {
  return href.startsWith("/") ? (
    <Link href={href} {...rest}>
      {children}
    </Link>
  ) : (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}
