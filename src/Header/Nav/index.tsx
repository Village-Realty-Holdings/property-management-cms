'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'

export const HeaderNav: React.FC<{ data: HeaderType | null }> = ({ data }) => {
  const navItems = data?.navItems || []
  const cta = data?.ctaLink

  return (
    <nav className="flex gap-3 items-center">
      {navItems.map(({ link }, i) => {
        return <CMSLink key={i} {...link} appearance="link" />
      })}
      <Link href="/search">
        <span className="sr-only">Search</span>
        <SearchIcon className="w-5 text-primary" />
      </Link>
      {cta?.label && cta.url && (
        <Button size="sm" nativeButton={false} render={<a href={cta.url} target={cta.newTab ? '_blank' : undefined} rel={cta.newTab ? 'noreferrer' : undefined} />}>
          {cta.label}
        </Button>
      )}
    </nav>
  )
}
