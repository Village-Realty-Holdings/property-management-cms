'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useId, useState } from 'react'
import { MenuIcon, SearchIcon, XIcon } from 'lucide-react'

import type { Header } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import { Button } from '@/components/ui/button'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { cn } from '@/lib/ui'

type Props = { data: Header | null }

/**
 * Sticky site header. Over a full-bleed hero it starts transparent with
 * light text and gains a solid background once the page scrolls; everywhere
 * else it is solid from the start.
 */
export const HeaderClient: React.FC<Props> = ({ data }) => {
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const menuId = useId()

  // Each page decides whether it has a hero behind the header.
  useEffect(() => {
    setHeaderTheme(null)
  }, [pathname, setHeaderTheme])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const overHero = headerTheme === 'dark' && !scrolled && !open
  const navItems = data?.navItems || []
  const cta = data?.ctaLink

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-300',
        overHero
          ? 'text-white'
          : 'border-b border-border/70 bg-background/85 text-foreground backdrop-blur-md supports-[backdrop-filter]:bg-background/75',
      )}
      {...(overHero ? { 'data-theme': 'dark' } : {})}
    >
      <div className="container flex h-header items-center justify-between gap-6">
        <Link href="/" className="flex items-center rounded-md">
          <Logo brand={data?.brand} />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {navItems.map(({ link }, i) => (
            <CMSLink
              key={i}
              {...link}
              appearance="inline"
              className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-foreground/8"
            />
          ))}
          <Link
            href="/search"
            className="ml-1 inline-flex size-10 items-center justify-center rounded-md transition-colors hover:bg-foreground/8"
          >
            <SearchIcon className="size-5" aria-hidden="true" />
            <span className="sr-only">Search</span>
          </Link>
          {cta?.label && cta.url && (
            <Button
              className="ml-2"
              variant={overHero ? 'inverse' : 'default'}
              nativeButton={false}
              render={
                <a
                  href={cta.url}
                  target={cta.newTab ? '_blank' : undefined}
                  rel={cta.newTab ? 'noreferrer' : undefined}
                />
              }
            >
              {cta.label}
            </Button>
          )}
        </nav>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md transition-colors hover:bg-foreground/8 lg:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <XIcon className="size-5" aria-hidden="true" /> : <MenuIcon className="size-5" aria-hidden="true" />}
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>

      <div
        id={menuId}
        hidden={!open}
        className="border-t border-border bg-background text-foreground lg:hidden"
      >
        <nav
          aria-label="Main"
          className="container flex flex-col gap-1 py-4"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setOpen(false)
          }}
        >
          {navItems.map(({ link }, i) => (
            <CMSLink
              key={i}
              {...link}
              appearance="inline"
              className="rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
            />
          ))}
          <Link href="/search" className="flex items-center gap-2 rounded-md px-3 py-3 text-base font-medium hover:bg-muted">
            <SearchIcon className="size-4" aria-hidden="true" />
            Search
          </Link>
          {cta?.label && cta.url && (
            <Button
              className="mt-3 w-full"
              size="lg"
              nativeButton={false}
              render={
                <a
                  href={cta.url}
                  target={cta.newTab ? '_blank' : undefined}
                  rel={cta.newTab ? 'noreferrer' : undefined}
                />
              }
            >
              {cta.label}
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
