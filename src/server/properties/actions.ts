'use server'

import type { PropertyQuery, PropertySearchResult } from './types'

import { getPropertyProvider } from './index'

/** Server action so client components can refine a listing without an API route. */
export async function searchProperties(query: PropertyQuery): Promise<PropertySearchResult> {
  return getPropertyProvider().search(query)
}
