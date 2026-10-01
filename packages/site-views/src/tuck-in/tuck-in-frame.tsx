import type { CSSProperties, ReactNode } from "react"
import Image from "next/image"
import { PhoneIcon } from "lucide-react"

import type { SiteSettings } from "@workspace/content/queries"
import { cn } from "@workspace/ui/lib/utils"

import {
  readableOn,
  resolveBrand,
  telHref,
  type Brand,
} from "../theme/branding"
import { clientLink } from "../lib/utm"

/**
 * The Tuck-In Page Template's chrome, in place of the Site's header and
 * navigation (pclodge-landing): a top bar with the phone, a header logo
 * linking to the Client's website, and a footer. Themed from Site Settings:
 * the bar and footer in the primary colour, buttons in the accent.
 */
export function TuckInFrame({
  settings,
  year,
  children,
}: {
  settings: SiteSettings
  year: number
  children: ReactNode
}) {
  const brand = resolveBrand(settings)
  const site = { slug: settings.slug, clientUrl: settings.client.url }
  const clientHome = settings.client.url
  const logoAlt = settings.client.name ?? brand.name
  // Headings in a deep shade of the primary, as pclodge-landing's navy.
  const band = {
    "--tuck-in-heading": `color-mix(in oklab, ${brand.primary} 45%, black)`,
  } as CSSProperties
  const bandText = readableOn(brand.primary)

  return (
    <div style={band} className="flex min-h-svh flex-col">
      {brand.phone && (
        <div className="bg-(--brand-primary) text-(--brand-primary-foreground)">
          <div className="mx-auto flex max-w-285 px-5 py-2.5 text-sm font-semibold">
            <a
              href={telHref(brand.phone)}
              className="inline-flex items-center gap-2"
            >
              <PhoneIcon aria-hidden className="size-3.5" />
              {brand.phone}
            </a>
          </div>
        </div>
      )}
      <header className="mx-auto flex w-full max-w-285 items-center justify-between gap-4 px-5 py-6">
        <LogoLink
          href={clientHome ? clientLink(clientHome, site, "logo") : "/"}
          brand={brand}
          alt={logoAlt}
          className="w-56 sm:w-72"
          preload
        />
      </header>
      <main id="main" className="flex-1 pb-16">
        {children}
      </main>
      <footer className="bg-(--brand-primary) text-(--brand-primary-foreground)">
        <div className="mx-auto flex max-w-285 flex-col gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between">
          <LogoLink
            href={
              clientHome ? clientLink(clientHome, site, "footer_logo") : "/"
            }
            brand={brand}
            alt={logoAlt}
            className={cn(
              "w-56",
              // A reversed logo on a dark bar, as pclodge-landing's fallback.
              bandText === "#ffffff" && "brightness-0 invert"
            )}
          />
          <p className="text-sm">© {year} All Rights Reserved</p>
        </div>
      </footer>
    </div>
  )
}

/** The logo (the Site's Branding logo), else the name in bold. */
function LogoLink({
  href,
  brand,
  alt,
  className,
  preload,
}: {
  href: string
  brand: Brand
  alt: string
  className?: string
  preload?: boolean
}) {
  return (
    <a href={href} className="inline-flex">
      {brand.logo ? (
        <Image
          src={brand.logo.url}
          alt={alt}
          width={brand.logo.width ?? 250}
          height={brand.logo.height ?? 100}
          preload={preload}
          className={cn("h-auto", className)}
        />
      ) : (
        <span className="text-2xl font-extrabold">{alt}</span>
      )}
    </a>
  )
}
