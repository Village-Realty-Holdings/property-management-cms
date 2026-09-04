import React from 'react'
import { MapPin } from 'lucide-react'

import type { AreaGuideBlock as Props } from '@/payload-types'

import { Media } from '@/components/Media'
import { searchParamKeys as k } from '@/server/properties/format'
import { cn } from '@/lib/ui'

export const AreaGuideBlock: React.FC<Props & { disableInnerContainer?: boolean }> = ({
  heading,
  intro,
  layout,
  items,
  searchPage,
}) => {
  if (!items?.length) return null
  const page = typeof searchPage === 'object' && searchPage ? searchPage : null
  const searchHref = page?.slug ? (page.slug === 'home' ? '/' : `/${page.slug}`) : null
  const rows = layout === 'rows'

  return (
    <div className="container">
      {(heading || intro) && (
        <header className="mb-8 max-w-[48rem]">
          {heading && <h2 className="text-3xl font-semibold">{heading}</h2>}
          {intro && <p className="mt-2 text-muted-foreground">{intro}</p>}
        </header>
      )}
      <div className={cn(rows ? 'flex flex-col gap-12' : 'grid gap-6 md:grid-cols-2 lg:grid-cols-3')}>
        {items.map((item, i) => {
          const media =
            item.image && typeof item.image === 'object' ? (
              <Media
                resource={item.image}
                imgClassName={cn('w-full rounded object-cover', rows ? 'aspect-[3/2]' : 'aspect-[4/3]')}
              />
            ) : null
          return (
            <article
              key={item.id ?? i}
              className={cn(
                rows
                  ? 'grid items-center gap-8 md:grid-cols-2'
                  : 'flex flex-col overflow-hidden rounded border border-border bg-card',
              )}
            >
              <div className={cn(rows && i % 2 === 1 && 'md:order-2')}>{media}</div>
              <div className={cn('flex flex-col gap-2', !rows && 'p-4')}>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {item.category}
                  {item.distance && (
                    <span className="flex items-center gap-1 normal-case tracking-normal">
                      <MapPin className="size-3" aria-hidden="true" /> {item.distance}
                    </span>
                  )}
                </div>
                <h3 className={cn('font-semibold', rows ? 'text-2xl' : 'text-lg')}>{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.text}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  {item.linkUrl && (
                    <a href={item.linkUrl} className="underline">
                      {item.linkLabel || 'Read more'}
                    </a>
                  )}
                  {searchHref && item.nodeId && (
                    <a href={`${searchHref}?${k.node}=${encodeURIComponent(item.nodeId)}`} className="underline">
                      See rentals here
                    </a>
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
