import React from 'react'

import type { ReviewsFeedBlock as Props } from '@/payload-types'

import { SectionHeader } from '@/components/SectionHeader'
import { Stars } from '@/components/Stars'
import { getPropertyProvider } from '@/server/properties'
import { cn } from '@/lib/ui'

export const ReviewsFeedBlock: React.FC<Props> = async ({
  heading,
  propertyCode,
  minRating,
  limit,
  layout,
  showUnit,
  showSummary,
}) => {
  const provider = getPropertyProvider()
  const [reviews, all] = await Promise.all([
    provider.listReviews({
      propertyCode: propertyCode || undefined,
      minRating: minRating ?? undefined,
      limit: limit ?? 6,
    }),
    showSummary ? provider.listReviews({ propertyCode: propertyCode || undefined }) : [],
  ])
  if (reviews.length === 0) return null

  const names = new Map<string, string>()
  if (showUnit) {
    const codes = [...new Set(reviews.map((r) => r.propertyCode))]
    const props = await Promise.all(codes.map((c) => provider.getByCode(c)))
    props.forEach((p) => p && names.set(p.code, p.name))
  }
  const avg = all.length ? all.reduce((s, r) => s + r.rating, 0) / all.length : null

  const card = (r: (typeof reviews)[number]) => (
    <figure
      key={r.id}
      className={cn(
        'surface flex flex-col gap-3 p-5 md:p-6',
        layout === 'carousel' && 'w-[80vw] shrink-0 snap-start sm:w-[22rem]',
      )}
    >
      <Stars value={r.rating} />
      <blockquote className="flex flex-col gap-2">
        {r.title && <p className="font-semibold">{r.title}</p>}
        <p className="text-sm text-muted-foreground">{r.body}</p>
      </blockquote>
      <figcaption className="mt-auto flex flex-wrap gap-x-2 pt-1 text-sm">
        <span className="font-medium">{r.author}</span>
        <span className="text-muted-foreground">{r.stayedAt}</span>
        {showUnit && names.get(r.propertyCode) && (
          <span className="text-muted-foreground">{names.get(r.propertyCode)}</span>
        )}
      </figcaption>
      {r.response && (
        <p className="border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Owner response </span>
          {r.response}
        </p>
      )}
    </figure>
  )

  return (
    <div className="container">
      <SectionHeader
        heading={heading}
        aside={
          showSummary && avg !== null ? (
            <p className="flex items-center gap-2 text-sm">
              <Stars value={Math.round(avg)} size="md" />
              <strong>{avg.toFixed(1)}</strong>
              <span className="text-muted-foreground">from {all.length} verified stays</span>
            </p>
          ) : undefined
        }
      />
      {layout === 'carousel' ? (
        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 md:-mx-8 md:px-8">
          {reviews.map(card)}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">{reviews.map(card)}</div>
      )}
    </div>
  )
}
