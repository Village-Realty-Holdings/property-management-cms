import React from 'react'
import { Bath, BedDouble, Check, Clock, ExternalLink, MapPin, PawPrint, Star, Users } from 'lucide-react'

import type { PropertyDetailBlock as Props } from '@/payload-types'
import type { Property } from '@/server/properties/types'

import { Stars } from '@/components/Stars'
import { Button } from '@/components/ui/button'
import { formatBaths, formatRate, getPropertyProvider, nodePath } from '@/server/properties'
import { PhotoGrid } from './PhotoGrid.client'

type Section = NonNullable<Props['sections']>[number]

const pets = (p: Property) => {
  if (!p.petsAllowed) return 'No pets'
  const max = p.maxPets ?? 1
  return `Up to ${max} pet${max > 1 ? 's' : ''}`
}

export const PropertyDetailView: React.FC<Props & { property: Property }> = async ({
  property: p,
  sections,
  bookLabel,
  bookUrl,
}) => {
  const provider = getPropertyProvider()
  const show = new Set<Section>(sections ?? [])
  const [nodes, groups, reviews, promos] = await Promise.all([
    provider.listNodes(),
    show.has('amenities') ? provider.listAmenityGroups() : [],
    show.has('reviews') ? provider.listReviews({ propertyCode: p.code, limit: 4 }) : [],
    show.has('promos') ? provider.listPromos({ propertyCode: p.code }) : [],
  ])
  const where = nodePath(p.nodeId, nodes)
  const amenitySet = new Set(p.amenityIds)
  const groupsWithItems = groups
    .map((g) => ({ ...g, amenities: g.amenities.filter((a) => amenitySet.has(a.id)) }))
    .filter((g) => g.amenities.length > 0)
  const href = bookUrl ? bookUrl.replaceAll('{code}', encodeURIComponent(p.code)) : null
  const label = bookLabel || 'Check availability'

  const bookButton = (className?: string) =>
    href && (
      <Button className={className} size="lg" nativeButton={false} render={<a href={href} />}>
        {label}
      </Button>
    )

  return (
    <div className="container pt-8 md:pt-12">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-[44rem]">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" aria-hidden="true" />
            {where.join(' / ')}
          </p>
          <h1 className="mt-2 text-display">{p.name}</h1>
          {p.headline && <p className="mt-3 text-lead text-muted-foreground">{p.headline}</p>}
        </div>
        <div className="flex items-center gap-5">
          {p.rating && (
            <span className="flex items-center gap-1.5 text-sm">
              <Star className="size-4 fill-warning text-warning" aria-hidden="true" />
              <strong>{p.rating.toFixed(1)}</strong>
              <span className="text-muted-foreground">({p.reviewCount} reviews)</span>
            </span>
          )}
          {bookButton('hidden md:inline-flex')}
        </div>
      </header>

      {show.has('photos') && p.photos.length > 0 && <PhotoGrid photos={p.photos} name={p.name} />}

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div className="flex flex-col gap-12">
          {show.has('summary') && (
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <li className="flex items-center gap-2">
                <BedDouble className="size-4 text-muted-foreground" aria-hidden="true" /> {p.bedrooms} bedrooms
              </li>
              <li className="flex items-center gap-2">
                <Bath className="size-4 text-muted-foreground" aria-hidden="true" /> {formatBaths(p.bathrooms)}{' '}
                bathrooms
              </li>
              <li className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" aria-hidden="true" /> Sleeps {p.sleeps}
              </li>
              <li className="flex items-center gap-2">
                <PawPrint className="size-4 text-muted-foreground" aria-hidden="true" /> {pets(p)}
              </li>
              <li className="flex items-center gap-2 capitalize">
                <MapPin className="size-4 text-muted-foreground" aria-hidden="true" /> {p.type} in {p.address.city}
              </li>
            </ul>
          )}

          {show.has('description') && (
            <section className="prose max-w-none dark:prose-invert">
              {p.description.split(/\n\n+/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </section>
          )}

          {show.has('amenities') && groupsWithItems.length > 0 && (
            <section>
              <h2 className="mb-5 text-subtitle">Amenities</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {groupsWithItems.map((g) => (
                  <div key={g.id}>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">{g.name}</h3>
                    <ul className="flex flex-col gap-1.5 text-sm">
                      {g.amenities.map((a) => (
                        <li key={a.id} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                          {a.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {show.has('reasons') && p.reasonsToBook?.length ? (
            <section className="surface bg-muted/60 p-6">
              <h2 className="mb-3 text-subtitle">Why guests pick this home</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {p.reasonsToBook.map((r) => (
                  <li key={r} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> {r}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {show.has('reviews') && reviews.length > 0 && (
            <section>
              <h2 className="mb-5 text-subtitle">Guest reviews</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => (
                  <figure key={r.id} className="surface flex flex-col gap-2 p-5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <strong>{r.title}</strong>
                      <Stars value={r.rating} />
                    </div>
                    <blockquote className="text-muted-foreground">{r.body}</blockquote>
                    <figcaption className="mt-1 text-xs text-muted-foreground">
                      {r.author}, stayed {r.stayedAt}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          {show.has('rates') && (
            <div className="surface p-6 shadow-lg shadow-foreground/5">
              <p>
                <span className="text-title font-semibold">{formatRate(p.rates.avgNightly, p.rates.currency)}</span>
                <span className="text-muted-foreground"> avg / night</span>
              </p>
              <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Rates from</dt>
                <dd>
                  {formatRate(p.rates.min, p.rates.currency)} to {formatRate(p.rates.max, p.rates.currency)}
                </dd>
                <dt className="text-muted-foreground">Minimum stay</dt>
                <dd>{p.rates.minStay} nights</dd>
                {p.checkIn && (
                  <>
                    <dt className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3.5" aria-hidden="true" /> Check-in
                    </dt>
                    <dd>{p.checkIn}</dd>
                  </>
                )}
                {p.checkOut && (
                  <>
                    <dt className="text-muted-foreground">Check-out</dt>
                    <dd>{p.checkOut}</dd>
                  </>
                )}
              </dl>
              {bookButton('mt-6 w-full')}
              <p className="mt-3 text-xs text-muted-foreground">
                Nightly rates vary by season and include required fees. Taxes are added at checkout.
              </p>
            </div>
          )}

          {show.has('promos') && promos.length > 0 && (
            <div className="surface border-primary/25 bg-accent/40 p-6">
              <h2 className="mb-3 text-base font-semibold">Current offers</h2>
              <ul className="flex flex-col gap-3 text-sm">
                {promos.map((promo) => (
                  <li key={promo.id}>
                    <strong>{promo.offer}</strong>, {promo.name}
                    {promo.code && (
                      <span className="ml-1.5 rounded-sm bg-background px-1.5 py-0.5 font-mono text-xs">
                        {promo.code}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {show.has('tours') && (p.tourUrl || p.videoTourUrl) && (
            <div className="flex flex-col gap-2 text-sm">
              {p.tourUrl && (
                <a
                  href={p.tourUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-fit items-center gap-1.5 rounded-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" /> 3D virtual tour
                </a>
              )}
              {p.videoTourUrl && (
                <a
                  href={p.videoTourUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-fit items-center gap-1.5 rounded-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" /> Video tour
                </a>
              )}
            </div>
          )}
        </aside>
      </div>

      {href && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 p-4 backdrop-blur-md md:hidden">
          <Button className="w-full" size="lg" nativeButton={false} render={<a href={href} />}>
            {label}
          </Button>
        </div>
      )}
    </div>
  )
}
