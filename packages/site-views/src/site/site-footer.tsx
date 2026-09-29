import Link from "next/link"
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"

import type { NavLink } from "@workspace/content/queries"

import { telHref, type Brand, type SocialPlatform } from "../theme/branding"

import { displayFont } from "./display"

export type SiteFooterProps = {
  brand: Brand
  navigation: NavLink[]
  /** For the copyright line. @default the current year */
  year?: number
}

const socialNames: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  youtube: "YouTube",
  tiktok: "TikTok",
}

const linkClass =
  "rounded-sm underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-(--brand-accent)/60 focus-visible:outline-none"

/**
 * The Site's footer on its primary colour: name and tagline, contact
 * details, navigation, social links and "© <year> <Site name>".
 */
export function SiteFooter({ brand, navigation, year }: SiteFooterProps) {
  const contact = [
    brand.phone && {
      icon: PhoneIcon,
      label: brand.phone,
      href: telHref(brand.phone),
    },
    brand.email && {
      icon: MailIcon,
      label: brand.email,
      href: `mailto:${brand.email}`,
    },
  ].filter((item) => !!item)

  return (
    <footer className="bg-(--brand-primary) text-(--brand-primary-foreground)">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pt-16 pb-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="flex flex-col gap-4">
          <p className={`${displayFont} text-3xl leading-none`}>{brand.name}</p>
          {brand.tagline && (
            <p className="max-w-sm text-base opacity-80">{brand.tagline}</p>
          )}
          <div
            aria-hidden
            className="h-1 w-16 rounded-full bg-(--brand-accent)"
          />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold opacity-70">Get in touch</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {contact.map(({ icon: Icon, label, href }) => (
              <li key={href} className="flex items-center gap-2.5">
                <Icon aria-hidden className="size-4 shrink-0 opacity-70" />
                <a href={href} className={linkClass}>
                  {label}
                </a>
              </li>
            ))}
            {brand.address && (
              <li className="flex items-start gap-2.5">
                <MapPinIcon
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 opacity-70"
                />
                <address className="whitespace-pre-line not-italic">
                  {brand.address}
                </address>
              </li>
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-8 sm:flex-row md:flex-col">
          {navigation.length > 0 && (
            <nav aria-label="Footer" className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold opacity-70">Explore</h2>
              <ul className="flex flex-col gap-2 text-sm">
                <li>
                  <Link href="/" className={linkClass}>
                    Home
                  </Link>
                </li>
                {navigation.map((link) => (
                  <li key={`${link.href}-${link.label}`}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {brand.social.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold opacity-70">Follow along</h2>
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {brand.social.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      rel="noopener noreferrer me"
                      target="_blank"
                      className={linkClass}
                    >
                      {socialNames[link.platform] ?? link.platform}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-current/15">
        <p className="mx-auto max-w-7xl px-4 py-6 text-sm opacity-75 sm:px-6 lg:px-8">
          © {year ?? new Date().getFullYear()} {brand.name}
        </p>
      </div>
    </footer>
  )
}
