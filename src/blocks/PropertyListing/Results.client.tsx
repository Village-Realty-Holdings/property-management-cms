'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'

import type { PropertyQuery, PropertySearchResult } from '@/server/properties/types'

import { PropertyCard } from '@/components/PropertyCard'
import { searchProperties } from '@/server/properties/actions'
import { searchParamKeys as k } from '@/server/properties/format'
import { cn } from '@/lib/ui'

type Props = {
  baseQuery: PropertyQuery
  initial: PropertySearchResult
  followSearchParams: boolean
  view: 'grid' | 'carousel'
  columns: '2' | '3' | '4'
  detailHref: string | null
  emptyMessage: string
}

const columnClasses: Record<Props['columns'], string> = {
  '2': 'md:grid-cols-2',
  '3': 'md:grid-cols-2 lg:grid-cols-3',
  '4': 'md:grid-cols-2 lg:grid-cols-4',
}

const num = (v: string | null) => {
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export const ListingResults: React.FC<Props> = ({
  baseQuery,
  initial,
  followSearchParams,
  view,
  columns,
  detailHref,
  emptyMessage,
}) => {
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [fetched, setFetched] = useState<{ key: string; result: PropertySearchResult } | null>(null)

  const refined = useMemo<PropertyQuery | null>(() => {
    if (!followSearchParams) return null
    const arrival = params.get(k.arrival) || undefined
    const departure = params.get(k.departure) || undefined
    const guests = num(params.get(k.guests))
    const bedrooms = num(params.get(k.bedrooms))
    const nodeId = params.get(k.node) || undefined
    const pets = params.get(k.pets) === '1' || undefined
    if (!arrival && !departure && !guests && !bedrooms && !nodeId && !pets) return null
    return {
      ...baseQuery,
      arrival,
      departure,
      guests: Math.max(guests ?? 0, baseQuery.guests ?? 0) || undefined,
      bedrooms: Math.max(bedrooms ?? 0, baseQuery.bedrooms ?? 0) || undefined,
      nodeId: nodeId ?? baseQuery.nodeId,
      pets: pets ?? baseQuery.pets,
      // A search should show everything that matches, not the block's teaser count.
      limit: 48,
    }
  }, [followSearchParams, params, baseQuery])

  const key = refined ? JSON.stringify(refined) : null

  useEffect(() => {
    if (!key || !refined) return
    let cancelled = false
    startTransition(async () => {
      const result = await searchProperties(refined)
      if (!cancelled) setFetched({ key, result })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the serialised query
  }, [key])

  // Without URL refinements show the server render; with them, the last fetch (or the
  // previous result while the new one loads).
  const result = key ? (fetched?.result ?? initial) : initial

  const filters = refined
    ? [
        refined.arrival && refined.departure ? `${refined.arrival} to ${refined.departure}` : null,
        refined.guests ? `${refined.guests}+ guests` : null,
        refined.bedrooms ? `${refined.bedrooms}+ bedrooms` : null,
        refined.pets ? 'pet friendly' : null,
      ].filter((f): f is string => Boolean(f))
    : []

  return (
    <div className={cn(pending && 'opacity-60 transition-opacity')} aria-busy={pending}>
      {refined && (
        <p className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {result.total} {result.total === 1 ? 'rental' : 'rentals'}
          </span>
          {filters.map((f) => (
            <span key={f} className="rounded-md bg-muted px-2 py-0.5">
              {f}
            </span>
          ))}
        </p>
      )}

      {result.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          {emptyMessage}
        </p>
      ) : view === 'carousel' ? (
        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 md:-mx-8 md:px-8">
          {result.items.map((p) => (
            <PropertyCard
              key={p.code}
              property={p}
              href={detailHref}
              compact
              className="w-[80vw] shrink-0 snap-start sm:w-[20rem]"
            />
          ))}
        </div>
      ) : (
        <div className={cn('grid grid-cols-1 gap-5 md:gap-6', columnClasses[columns])}>
          {result.items.map((p) => (
            <PropertyCard key={p.code} property={p} href={detailHref} />
          ))}
        </div>
      )}
    </div>
  )
}
