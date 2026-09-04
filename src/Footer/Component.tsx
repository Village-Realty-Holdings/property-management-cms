import { getTenantGlobal } from '@/server/getGlobals'
import Link from 'next/link'
import React from 'react'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
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
    <footer className="mt-auto border-t border-border bg-black dark:bg-card text-white">
      <div className="container py-10 grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Link className="flex items-center" href="/">
            {brand ? <span className="text-xl font-semibold">{brand}</span> : <Logo />}
          </Link>
          {footerData?.tagline && <p className="text-sm text-white/70">{footerData.tagline}</p>}
        </div>

        <nav className="flex flex-col gap-2 text-sm">
          {navItems.map(({ link }, i) => (
            <CMSLink className="text-white" key={i} {...link} />
          ))}
        </nav>

        {hasContact && (
          <address className="not-italic text-sm text-white/80 flex flex-col gap-2">
            {contact?.phone && (
              <a className="text-white" href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}>
                {contact.phone}
              </a>
            )}
            <span>
              <Lines text={contact?.address} />
            </span>
            <span className="text-white/60">
              <Lines text={contact?.hours} />
            </span>
          </address>
        )}
      </div>
      <div className="container pb-6 flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between text-xs text-white/60">
        <span>
          © {new Date().getFullYear()} {footerData?.copyright ?? brand ?? ''}
        </span>
        <ThemeSelector />
      </div>
    </footer>
  )
}
