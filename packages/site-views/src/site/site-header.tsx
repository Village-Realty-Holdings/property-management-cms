import Image from "next/image"
import Link from "next/link"
import { PhoneIcon } from "lucide-react"

import type { NavLink } from "@workspace/content/queries"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { telHref, type Brand } from "../theme/branding"

import { displayFont } from "./display"

export type SiteHeaderProps = {
  brand: Brand
  navigation: NavLink[]
}

/** The Site's logo, or its name set in the display face. */
export function SiteMark({
  brand,
  className,
}: {
  brand: Brand
  className?: string
}) {
  if (brand.logo) {
    const { url, width, height } = brand.logo
    return (
      <Image
        src={url}
        alt={brand.name}
        width={width ?? 160}
        height={height ?? 48}
        className={cn("h-10 w-auto", className)}
        preload
      />
    )
  }
  return (
    <span
      className={cn(displayFont, "text-xl leading-none sm:text-2xl", className)}
    >
      {brand.name}
    </span>
  )
}

/**
 * Logo or name, the Site's navigation (Pages shown in nav), and a call
 * button when the Site has a phone number. On small screens the navigation
 * becomes a scrollable row under the bar.
 */
export function SiteHeader({ brand, navigation }: SiteHeaderProps) {
  const nav = navigation.length > 0 && (
    <ul className="flex items-center gap-1">
      {navigation.map((link) => (
        <li key={`${link.href}-${link.label}`}>
          <Link
            href={link.href}
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 rounded-sm text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <SiteMark brand={brand} />
          <span className="sr-only">, home</span>
        </Link>
        {nav && (
          <nav aria-label="Main" className="ml-auto hidden md:block">
            {nav}
          </nav>
        )}
        {brand.phone && (
          <a
            href={telHref(brand.phone)}
            aria-label={`Call ${brand.phone}`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-10 shrink-0 rounded-full px-4",
              nav ? "ml-auto md:ml-0" : "ml-auto"
            )}
          >
            <PhoneIcon data-icon="inline-start" aria-hidden />
            <span className="sm:hidden">Call</span>
            <span className="hidden sm:inline">{brand.phone}</span>
          </a>
        )}
      </div>
      {nav && (
        <nav
          aria-label="Main"
          className="-mt-2 overflow-x-auto px-2 pb-2 md:hidden"
        >
          {nav}
        </nav>
      )}
    </header>
  )
}
