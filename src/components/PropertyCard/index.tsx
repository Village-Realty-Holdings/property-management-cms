import React from 'react'
import { Bath, BedDouble, PawPrint, Star, Users } from 'lucide-react'

import type { Property } from '@/server/properties/types'

import { formatBaths, formatRate } from '@/server/properties/format'
import { cn } from '@/lib/ui'

type Props = {
  property: Property
  /** Path the card links to; the property code is appended as `?unit=CODE` when set. */
  href?: string | null
  className?: string
  compact?: boolean
}

export const PropertyCard: React.FC<Props> = ({ property, href, className, compact }) => {
  const cover = property.photos[0]
  const link = href ? `${href}${href.includes('?') ? '&' : '?'}unit=${encodeURIComponent(property.code)}` : null
  const Title: React.ElementType = link ? 'a' : 'div'

  return (
    <article
      className={cn(
        'group surface relative flex flex-col overflow-hidden transition-shadow has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/40 hover:shadow-lg hover:shadow-foreground/5',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {cover && (
          // Photos come from the PMS CDN, not Payload media, so next/image's allowlist doesn't apply.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={cover.caption ?? property.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        )}
        {property.featured && (
          <span className="absolute top-3 left-3 rounded-md bg-background/95 px-2 py-1 text-xs font-medium text-foreground">
            Featured
          </span>
        )}
        {property.rating && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-background/95 px-2 py-1 text-xs font-medium">
            <Star className="size-3 fill-warning text-warning" aria-hidden="true" />
            {property.rating.toFixed(1)}
            <span className="text-muted-foreground">({property.reviewCount})</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4 md:p-5">
        <p className="text-sm text-muted-foreground">
          {property.address.city}, {property.address.state}
        </p>
        <h3 className="text-lg leading-snug">
          <Title
            {...(link ? { href: link, className: 'after:absolute after:inset-0 outline-none' } : {})}
          >
            {property.name}
          </Title>
        </h3>
        {!compact && property.headline && (
          <p className="text-sm text-muted-foreground">{property.headline}</p>
        )}

        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <BedDouble className="size-4" aria-hidden="true" /> {property.bedrooms} bed
          </li>
          <li className="flex items-center gap-1.5">
            <Bath className="size-4" aria-hidden="true" /> {formatBaths(property.bathrooms)} bath
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="size-4" aria-hidden="true" /> Sleeps {property.sleeps}
          </li>
          {property.petsAllowed && (
            <li className="flex items-center gap-1.5">
              <PawPrint className="size-4" aria-hidden="true" /> Pets
            </li>
          )}
        </ul>

        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <p>
            <span className="text-lg font-semibold">
              {formatRate(property.rates.avgNightly, property.rates.currency)}
            </span>
            <span className="text-sm text-muted-foreground"> avg / night</span>
          </p>
          <span className="text-xs text-muted-foreground">{property.rates.minStay}-night min</span>
        </div>
      </div>
    </article>
  )
}
