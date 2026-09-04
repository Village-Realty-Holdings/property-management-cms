import React from 'react'

import type { AvailabilitySearchBlock as Props } from '@/payload-types'

import { getPropertyProvider } from '@/server/properties'
import { SearchForm } from './Form.client'

const collectScoped = (
  nodes: Awaited<ReturnType<ReturnType<typeof getPropertyProvider>['listNodes']>>,
  scope?: string | null,
) => {
  if (!scope) return nodes
  const keep = new Set<string>([scope])
  let grew = true
  while (grew) {
    grew = false
    for (const n of nodes) {
      if (n.parentId && keep.has(n.parentId) && !keep.has(n.id)) {
        keep.add(n.id)
        grew = true
      }
    }
  }
  return nodes.filter((n) => keep.has(n.id) && n.id !== scope)
}

export const AvailabilitySearchBlock: React.FC<Props & { disableInnerContainer?: boolean }> = async ({
  heading,
  resultsPage,
  showBedrooms,
  showNode,
  showPets,
  nodeScope,
  layout,
  buttonLabel,
}) => {
  const page = typeof resultsPage === 'object' ? resultsPage : null
  const action = page?.slug ? (page.slug === 'home' ? '/' : `/${page.slug}`) : '/'

  const nodes = showNode ? collectScoped(await getPropertyProvider().listNodes(), nodeScope) : []

  return (
    <div className="container">
      {heading && <h2 className="mb-4 text-2xl font-semibold">{heading}</h2>}
      <SearchForm
        action={action}
        buttonLabel={buttonLabel || 'Search'}
        layout={layout ?? 'bar'}
        nodes={nodes.map((n) => ({ id: n.id, name: n.name, type: n.type, parentId: n.parentId }))}
        showBedrooms={Boolean(showBedrooms)}
        showPets={Boolean(showPets)}
      />
    </div>
  )
}
