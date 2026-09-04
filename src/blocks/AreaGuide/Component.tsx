import React from 'react'
import Link from 'next/link'
import { ArrowUpRight, MapPin } from 'lucide-react'

import type { AreaGuideBlock as Props } from '@/payload-types'

import { Media } from '@/components/Media'
import { SectionHeader } from '@/components/SectionHeader'
import { searchParamKeys as k } from '@/server/properties/format'
import { pagePath } from '@/lib/pagePath'
import { cn } from '@/lib/ui'

const linkClass =
  'inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline'

export const AreaGuideBlock: React.FC<Props> = ({ heading, intro, layout, items, searchPage }) => {
  if (!items?.length) return null
  const searchHref = pagePath(searchPage)
  const rows = layout === 'rows'

  return (
    <div className="container">
      <SectionHeader heading={heading} intro={intro} />
      <div className={cn(rows ? 'flex flex-col gap-14 md:gap-20' : 'grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3')}>
        {items.map((item, i) => {
          const media =
            item.image && typeof item.image === 'object' ? (
              <Media
                resource={item.image}
                imgClassName={cn(
                  'w-full object-cover',
                  rows ? 'aspect-[3/2] rounded-xl' : 'aspect-[4/3]',
                )}
              />
            ) : null
          return (
            <article
              key={item.id ?? i}
              className={cn(
                rows ? 'grid items-center gap-8 md:grid-cols-2 md:gap-12' : 'surface flex flex-col overflow-hidden',
              )}
            >
              {media && <div className={cn(rows && i % 2 === 1 && 'md:order-2')}>{media}</div>}
              <div className={cn('flex flex-col gap-2', !rows && 'p-5')}>
                <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                  {item.category}
                  {item.distance && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden="true" /> {item.distance}
                    </span>
                  )}
                </p>
                <h3 className={cn(rows ? 'text-title' : 'text-subtitle')}>{item.title}</h3>
                <p className={cn('text-muted-foreground', rows ? 'text-lead' : 'text-sm')}>{item.text}</p>
                <div className="mt-2 flex flex-wrap gap-5">
                  {item.linkUrl && (
                    <Link href={item.linkUrl} className={linkClass}>
                      {item.linkLabel || 'Read more'}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                  {searchHref && item.nodeId && (
                    <Link
                      href={`${searchHref}?${k.node}=${encodeURIComponent(item.nodeId)}`}
                      className={linkClass}
                    >
                      See rentals here
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
