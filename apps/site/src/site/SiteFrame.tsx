import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

import type { Brand } from "./brand"
import { displayFont } from "./display"
import { telHref } from "./theme"

/**
 * The Site's header and footer from the Brand, around the page. Its colours
 * and fonts come from the Theme's variables, which the layout emits at :root
 * (see SiteThemeStyle) so portalled content is styled too.
 */
export function SiteFrame({
  brand,
  children,
}: {
  brand: Brand
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background font-sans text-foreground">
      <header className="border-b border-border bg-background/90">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            {brand.logo ? (
              <Image
                src={brand.logo.url}
                alt={brand.logo.alt || brand.name}
                width={160}
                height={48}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <span className={cn(displayFont, "text-2xl")}>{brand.name}</span>
            )}
          </Link>
          {brand.tagline && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {brand.tagline}
            </span>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-secondary">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-10 text-sm sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1">
            <span className={cn(displayFont, "text-lg")}>{brand.name}</span>
            {brand.address && (
              <address className="whitespace-pre-line text-muted-foreground not-italic">
                {brand.address}
              </address>
            )}
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            {brand.phone && <a href={telHref(brand.phone)}>{brand.phone}</a>}
            {brand.email && <a href={`mailto:${brand.email}`}>{brand.email}</a>}
            {brand.social.length > 0 && (
              <ul className="flex gap-3">
                {brand.social.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      className="capitalize underline-offset-4 hover:underline"
                    >
                      {link.platform}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
