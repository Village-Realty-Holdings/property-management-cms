import React from 'react'
import { Bath, BedDouble, Clock, ExternalLink, MapPin, PawPrint, Star, Users } from 'lucide-react'

import type { PropertyDetailBlock as Props } from '@/payload-types'
import type { Property } from '@/server/properties/types'

import { Button } from '@/components/ui/button'
import { formatBaths, formatRate, getPropertyProvider, nodePath } from '@/server/properties'
import { PhotoGrid } from './PhotoGrid.client'

type Section = NonNullable<Props['sections']>[number]

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

  return (
    <div className="container">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" aria-hidden="true" />
            {where.join(' › ')}
          </div>
          <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{p.name}</h1>
          {p.headline && <p className="mt-1 text-lg text-muted-foreground">{p.headline}</p>}
        </div>
        <div className="flex items-center gap-4">
          {p.rating && (
            <span className="flex items-center gap-1 text-sm">
              <Star className="size-4 fill-current" aria-hidden="true" />
              <strong>{p.rating.toFixed(1)}</strong>
              <span className="text-muted-foreground">({p.reviewCount} reviews)</span>
            </span>
          )}
          {href && (
            <Button size="lg" nativeButton={false} render={<a href={href} />}>
              {bookLabel || 'Check availability'}
            </Button>
          )}
        </div>
      </header>

      {show.has('photos') && p.photos.length > 0 && <PhotoGrid photos={p.photos} name={p.name} />}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-10">
          {show.has('summary') && (
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <li className="flex items-center gap-2">
                <BedDouble className="size-4" aria-hidden="true" /> {p.bedrooms} bedrooms
              </li>
              <li className="flex items-center gap-2">
                <Bath className="size-4" aria-hidden="true" /> {formatBaths(p.bathrooms)} bathrooms
              </li>
              <li className="flex items-center gap-2">
                <Users className="size-4" aria-hidden="true" /> Sleeps {p.sleeps}
              </li>
              <li className="flex items-center gap-2">
                <PawPrint className="size-4" aria-hidden="true" />
                {p.petsAllowed ? `Up to ${p.maxPets ?? 1} pet${(p.maxPets ?? 1) > 1 ? 's' : ''}` : 'No pets'}
              </li>
              <li className="flex items-center gap-2 capitalize">
                <MapPin className="size-4" aria-hidden="true" /> {p.type} in {p.address.city}
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
              <h2 className="mb-4 text-2xl font-semibold">Amenities</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {groupsWithItems.map((g) => (
                  <div key={g.id}>
                    <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      {g.name}
                    </h3>
                    <ul className="flex flex-col gap-1 text-sm">
                      {g.amenities.map((a) => (
                        <li key={a.id}>{a.name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {show.has('reasons') && p.reasonsToBook?.length ? (
            <section className="rounded border border-border bg-card p-6">
              <h2 className="mb-3 text-xl font-semibold">Why book this one</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {p.reasonsToBook.map((r) => (
                  <li key={r} className="flex gap-2 text-sm">
                    <span aria-hidden="true">✓</span> {r}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {show.has('reviews') && reviews.length > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-semibold">Guest reviews</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => (
                  <blockquote key={r.id} className="rounded border border-border bg-card p-4 text-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <strong>{r.title}</strong>
                      <span className="flex items-center gap-0.5" aria-label={`${r.rating} of 5 stars`}>
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="size-3 fill-current" aria-hidden="true" />
                        ))}
                      </span>
                    </div>
                    <p>{r.body}</p>
                    <footer className="mt-2 text-xs text-muted-foreground">
                      {r.author} · stayed {r.stayedAt}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          {show.has('rates') && (
            <div className="rounded border border-border bg-card p-6">
              <div className="text-3xl font-semibold">
                {formatRate(p.rates.avgNightly, p.rates.currency)}
                <span className="text-base font-normal text-muted-foreground"> avg / night</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Rates from</dt>
                <dd>
                  {formatRate(p.rates.min, p.rates.currency)} – {formatRate(p.rates.max, p.rates.currency)}
                </dd>
                <dt className="text-muted-foreground">Minimum stay</dt>
                <dd>{p.rates.minStay} nights</dd>
                {p.checkIn && (
                  <>
                    <dt className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3" aria-hidden="true" /> Check-in
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
              {href && (
                <Button className="mt-6 w-full" size="lg" nativeButton={false} render={<a href={href} />}>
                  {bookLabel || 'Check availability'}
                </Button>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Nightly rates vary by season and include required fees. Taxes added at checkout.
              </p>
            </div>
          )}

          {show.has('promos') && promos.length > 0 && (
            <div className="rounded border border-primary/40 bg-primary/5 p-6">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide">Current offers</h2>
              <ul className="flex flex-col gap-3 text-sm">
                {promos.map((promo) => (
                  <li key={promo.id}>
                    <strong>{promo.offer}</strong> · {promo.name}
                    {promo.code && (
                      <span className="ml-1 rounded bg-background px-1.5 py-0.5 font-mono text-xs">
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
                <a href={p.tourUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline">
                  <ExternalLink className="size-3" aria-hidden="true" /> 3D virtual tour
                </a>
              )}
              {p.videoTourUrl && (
                <a href={p.videoTourUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline">
                  <ExternalLink className="size-3" aria-hidden="true" /> Video tour
                </a>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
