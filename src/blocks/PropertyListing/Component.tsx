import React from 'react'

import type { PropertyListingBlock as Props } from '@/payload-types'
import type { PropertyQuery, PropertySort, PropertyType } from '@/server/properties/types'

import { getPropertyProvider } from '@/server/properties'
import { ListingResults } from './Results.client'

const pagePath = (page: Props['detailPage']) => {
  if (!page || typeof page !== 'object' || !page.slug) return null
  return page.slug === 'home' ? '/' : `/${page.slug}`
}

export const PropertyListingBlock: React.FC<Props & { disableInnerContainer?: boolean; id?: string | null }> =
  async ({ id, heading, intro, source, codes, query, view, columns, detailPage, emptyMessage }) => {
    const base: PropertyQuery =
      source === 'codes'
        ? { codes: (codes ?? []).map((c) => c.code).filter(Boolean) }
        : {
            nodeId: query?.nodeId || undefined,
            types: (query?.types as PropertyType[] | null | undefined) ?? undefined,
            bedrooms: query?.bedrooms ?? undefined,
            guests: query?.guests ?? undefined,
            pets: query?.pets || undefined,
            featuredOnly: query?.featuredOnly || undefined,
            amenityIds: query?.amenityIds ?? undefined,
            sort: (query?.sort as PropertySort | null | undefined) ?? 'featured',
            seed: id ?? undefined,
            limit: query?.limit ?? 6,
          }

    const initial = await getPropertyProvider().search(base)

    return (
      <div className="container">
        {(heading || intro) && (
          <header className="mb-8 max-w-[48rem]">
            {heading && <h2 className="text-3xl font-semibold">{heading}</h2>}
            {intro && <p className="mt-2 text-muted-foreground">{intro}</p>}
          </header>
        )}
        <ListingResults
          baseQuery={base}
          initial={initial}
          followSearchParams={source === 'query' && Boolean(query?.followSearchParams)}
          view={view ?? 'grid'}
          columns={columns ?? '3'}
          detailHref={pagePath(detailPage)}
          emptyMessage={emptyMessage || 'No rentals match.'}
        />
      </div>
    )
  }
