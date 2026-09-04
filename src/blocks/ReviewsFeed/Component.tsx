import React from 'react'
import { Star } from 'lucide-react'

import type { ReviewsFeedBlock as Props } from '@/payload-types'

import { getPropertyProvider } from '@/server/properties'
import { cn } from '@/lib/ui'

const Stars: React.FC<{ n: number }> = ({ n }) => (
  <span className="flex items-center gap-0.5" aria-label={`${n} of 5 stars`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn('size-3.5', i < n ? 'fill-current' : 'text-muted-foreground/40')}
        aria-hidden="true"
      />
    ))}
  </span>
)

export const ReviewsFeedBlock: React.FC<Props & { disableInnerContainer?: boolean }> = async ({
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
    <blockquote
      key={r.id}
      className={cn(
        'flex flex-col gap-3 rounded border border-border bg-card p-5',
        layout === 'carousel' && 'w-[80vw] shrink-0 snap-start sm:w-[22rem]',
      )}
    >
      <Stars n={r.rating} />
      {r.title && <strong>{r.title}</strong>}
      <p className="text-sm">{r.body}</p>
      <footer className="mt-auto text-xs text-muted-foreground">
        {r.author} · {r.stayedAt}
        {showUnit && names.get(r.propertyCode) && <> · {names.get(r.propertyCode)}</>}
      </footer>
      {r.response && (
        <p className="border-l-2 border-border pl-3 text-xs text-muted-foreground">
          <span className="font-medium">Owner response:</span> {r.response}
        </p>
      )}
    </blockquote>
  )

  return (
    <div className="container">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        {heading && <h2 className="text-3xl font-semibold">{heading}</h2>}
        {showSummary && avg !== null && (
          <div className="flex items-center gap-2 text-sm">
            <Stars n={Math.round(avg)} />
            <strong>{avg.toFixed(1)}</strong>
            <span className="text-muted-foreground">from {all.length} verified stays</span>
          </div>
        )}
      </header>
      {layout === 'carousel' ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4">
          {reviews.map(card)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{reviews.map(card)}</div>
      )}
    </div>
  )
}
