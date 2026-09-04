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
        'group relative flex flex-col overflow-hidden rounded border border-border bg-card',
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
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        {property.featured && (
          <span className="absolute left-3 top-3 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            Featured
          </span>
        )}
        {property.rating && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded bg-background/90 px-2 py-0.5 text-xs font-medium">
            <Star className="size-3 fill-current" aria-hidden="true" />
            {property.rating.toFixed(1)}
            <span className="text-muted-foreground">({property.reviewCount})</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {property.address.city}, {property.address.state}
        </div>
        <h3 className="text-lg font-semibold leading-tight">
          <Title {...(link ? { href: link, className: 'after:absolute after:inset-0' } : {})}>
            {property.name}
          </Title>
        </h3>
        {!compact && property.headline && (
          <p className="text-sm text-muted-foreground">{property.headline}</p>
        )}

        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-1">
            <BedDouble className="size-4" aria-hidden="true" /> {property.bedrooms} BR
          </li>
          <li className="flex items-center gap-1">
            <Bath className="size-4" aria-hidden="true" /> {formatBaths(property.bathrooms)} BA
          </li>
          <li className="flex items-center gap-1">
            <Users className="size-4" aria-hidden="true" /> Sleeps {property.sleeps}
          </li>
          {property.petsAllowed && (
            <li className="flex items-center gap-1">
              <PawPrint className="size-4" aria-hidden="true" /> Pets
            </li>
          )}
        </ul>

        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <div>
            <span className="text-lg font-semibold">
              {formatRate(property.rates.avgNightly, property.rates.currency)}
            </span>
            <span className="text-sm text-muted-foreground"> avg / night</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {property.rates.minStay}-night min
          </span>
        </div>
      </div>
    </article>
  )
}
