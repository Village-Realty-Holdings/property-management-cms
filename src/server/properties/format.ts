import type { PropertyNode } from './types'

export const formatRate = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amount,
  )

export const formatBaths = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1))

/** Full path of a node, root first, e.g. ["Emerald Coast", "Okaloosa Island", "Azure"]. */
export const nodePath = (nodeId: string, nodes: PropertyNode[]): string[] => {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const path: string[] = []
  let cur = byId.get(nodeId)
  while (cur) {
    path.unshift(cur.name)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }
  return path
}

/** Names of the URL parameters the Availability Search block writes and the Listing block reads. */
export const searchParamKeys = {
  arrival: 'arrival',
  departure: 'departure',
  guests: 'guests',
  bedrooms: 'bedrooms',
  node: 'node',
  pets: 'pets',
} as const
