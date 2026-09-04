import { getTenantGlobal } from '@/server/getGlobals'
import Link from 'next/link'
import React from 'react'

import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'

const Lines: React.FC<{ text?: string | null }> = ({ text }) =>
  text ? (
    <>
      {text.split('\n').map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </>
  ) : null

export async function Footer() {
  const footerData = await getTenantGlobal('footer', 1)
  const headerData = await getTenantGlobal('header', 0)

  const navItems = footerData?.navItems || []
  const contact = footerData?.contact
  const hasContact = Boolean(contact?.phone || contact?.address || contact?.hours)
  const brand = headerData?.brand

  return (
    <footer className="mt-24 border-t border-border bg-muted/60 md:mt-32">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:gap-12 md:py-20">
        <div className="flex max-w-sm flex-col gap-3">
          <Link className="inline-flex w-fit items-center rounded-md" href="/">
            <Logo brand={brand} />
          </Link>
          {footerData?.tagline && <p className="text-sm text-muted-foreground">{footerData.tagline}</p>}
        </div>

        {navItems.length > 0 && (
          <nav aria-label="Footer" className="flex flex-col gap-2.5 text-sm">
            {navItems.map(({ link }, i) => (
              <CMSLink
                className="w-fit rounded-sm transition-colors hover:text-primary"
                key={i}
                {...link}
              />
            ))}
          </nav>
        )}

        {hasContact && (
          <address className="flex flex-col gap-3 text-sm not-italic">
            {contact?.phone && (
              <a
                className="w-fit rounded-sm font-medium transition-colors hover:text-primary"
                href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
              >
                {contact.phone}
              </a>
            )}
            {contact?.address && (
              <span>
                <Lines text={contact.address} />
              </span>
            )}
            {contact?.hours && (
              <span className="text-muted-foreground">
                <Lines text={contact.hours} />
              </span>
            )}
          </address>
        )}
      </div>

      <div className="border-t border-border">
        <div className="container flex flex-col-reverse gap-4 py-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>
            © {new Date().getFullYear()} {footerData?.copyright ?? brand ?? ''}
          </span>
        </div>
      </div>
    </footer>
  )
}
