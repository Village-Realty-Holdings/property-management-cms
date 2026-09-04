import React from 'react'

import type { PropertyListingBlock as Props } from '@/payload-types'
import type { PropertyQuery, PropertySort, PropertyType } from '@/server/properties/types'

import { SectionHeader } from '@/components/SectionHeader'
import { getPropertyProvider } from '@/server/properties'
import { pagePath } from '@/lib/pagePath'
import { ListingResults } from './Results.client'

export const PropertyListingBlock: React.FC<Props & { id?: string | null }> = async ({
  id,
  heading,
  intro,
  source,
  codes,
  query,
  view,
  columns,
  detailPage,
  emptyMessage,
}) => {
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
      <SectionHeader heading={heading} intro={intro} />
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
