import type {
  Property,
  PropertyNode,
  PropertyProvider,
  PropertyQuery,
  PropertySort,
} from '../types'

import { amenityGroups, nodes, promos, properties, reviews } from './data'

const descendantIds = (rootId: string, all: PropertyNode[]): Set<string> => {
  const ids = new Set<string>([rootId])
  let grew = true
  while (grew) {
    grew = false
    for (const n of all) {
      if (n.parentId && ids.has(n.parentId) && !ids.has(n.id)) {
        ids.add(n.id)
        grew = true
      }
    }
  }
  return ids
}

const seededShuffle = <T>(items: T[], seed: string): T[] => {
  let s = 0
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

const sorters: Record<Exclude<PropertySort, 'random'>, (a: Property, b: Property) => number> = {
  featured: (a, b) => Number(b.featured) - Number(a.featured) || (b.rating ?? 0) - (a.rating ?? 0),
  'name-asc': (a, b) => a.name.localeCompare(b.name),
  'name-desc': (a, b) => b.name.localeCompare(a.name),
  'bedrooms-asc': (a, b) => a.bedrooms - b.bedrooms,
  'bedrooms-desc': (a, b) => b.bedrooms - a.bedrooms,
  'sleeps-asc': (a, b) => a.sleeps - b.sleeps,
  'sleeps-desc': (a, b) => b.sleeps - a.sleeps,
  'rate-asc': (a, b) => a.rates.avgNightly - b.rates.avgNightly,
  'rate-desc': (a, b) => b.rates.avgNightly - a.rates.avgNightly,
  'rating-desc': (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  'availability-desc': (a, b) => b.availabilityCount - a.availabilityCount,
}

const nightsBetween = (arrival?: string, departure?: string): number | null => {
  if (!arrival || !departure) return null
  const a = Date.parse(arrival)
  const d = Date.parse(departure)
  if (Number.isNaN(a) || Number.isNaN(d) || d <= a) return null
  return Math.round((d - a) / 86_400_000)
}

/**
 * In-memory provider over the fixtures. Mirrors the filters a PMS-backed
 * search exposes; availability is approximated with the minimum stay only.
 */
export const mockProvider: PropertyProvider = {
  name: 'mock',

  async search(query: PropertyQuery) {
    const nights = nightsBetween(query.arrival, query.departure)
    const nodeIds = query.nodeId ? descendantIds(query.nodeId, nodes) : null
    const codes = query.codes?.length ? new Set(query.codes) : null

    let items = properties.filter((p) => {
      if (!p.active) return false
      if (codes && !codes.has(p.code)) return false
      if (nodeIds && !nodeIds.has(p.nodeId)) return false
      if (query.featuredOnly && !p.featured) return false
      if (query.guests && p.sleeps < query.guests) return false
      if (query.bedrooms && p.bedrooms < query.bedrooms) return false
      if (query.bathrooms && p.bathrooms < query.bathrooms) return false
      if (query.pets && !p.petsAllowed) return false
      if (query.types?.length && !query.types.includes(p.type)) return false
      if (query.amenityIds?.length && !query.amenityIds.every((id) => p.amenityIds.includes(id)))
        return false
      if (nights !== null && nights < p.rates.minStay) return false
      return true
    })

    const sort = query.sort ?? 'featured'
    if (sort === 'random') {
      items = seededShuffle(items, query.seed ?? 'default')
    } else if (codes && sort === 'featured' && query.codes) {
      // Explicit code lists keep the editor's order.
      const order = query.codes
      items.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code))
    } else {
      items.sort(sorters[sort])
    }

    const total = items.length
    const offset = query.offset ?? 0
    const limit = query.limit ?? total
    return { items: items.slice(offset, offset + limit), total }
  },

  async getByCode(code) {
    return properties.find((p) => p.code === code && p.active) ?? null
  },

  async listNodes() {
    return nodes
  },

  async listAmenityGroups() {
    return amenityGroups
  },

  async listReviews(query = {}) {
    let list = reviews
    if (query.propertyCode) list = list.filter((r) => r.propertyCode === query.propertyCode)
    if (query.minRating) list = list.filter((r) => r.rating >= query.minRating!)
    list = [...list].sort((a, b) => b.stayedAt.localeCompare(a.stayedAt))
    return query.limit ? list.slice(0, query.limit) : list
  },

  async listPromos(query = {}) {
    const on = query.on ?? new Date().toISOString().slice(0, 10)
    const nodeIds = query.nodeId ? descendantIds(query.nodeId, nodes) : null
    const property = query.propertyCode ? properties.find((p) => p.code === query.propertyCode) : null

    let list = promos.filter((promo) => {
      if (promo.startsAt > on || promo.endsAt < on) return false
      if (query.propertyCode) {
        if (promo.propertyCodes && !promo.propertyCodes.includes(query.propertyCode)) return false
        if (promo.nodeId && property && !descendantIds(promo.nodeId, nodes).has(property.nodeId))
          return false
      }
      if (nodeIds && promo.nodeId && !nodeIds.has(promo.nodeId)) {
        // A promo scoped to an ancestor of the requested node still applies.
        if (!descendantIds(promo.nodeId, nodes).has(query.nodeId!)) return false
      }
      return true
    })
    list = list.sort((a, b) => a.endsAt.localeCompare(b.endsAt))
    return query.limit ? list.slice(0, query.limit) : list
  },
}
