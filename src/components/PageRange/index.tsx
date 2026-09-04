import React from 'react'

import { cn } from '@/lib/ui'

const defaultLabels = {
  plural: 'results',
  singular: 'result',
}

const defaultCollectionLabels = {
  posts: {
    plural: 'posts',
    singular: 'post',
  },
}

export const PageRange: React.FC<{
  className?: string
  collection?: keyof typeof defaultCollectionLabels
  collectionLabels?: {
    plural?: string
    singular?: string
  }
  currentPage?: number
  limit?: number
  totalDocs?: number
}> = (props) => {
  const {
    className,
    collection,
    collectionLabels: collectionLabelsFromProps,
    currentPage,
    limit,
    totalDocs,
  } = props

  let indexStart = (currentPage ? currentPage - 1 : 1) * (limit || 1) + 1
  if (totalDocs && indexStart > totalDocs) indexStart = 0

  let indexEnd = (currentPage || 1) * (limit || 1)
  if (totalDocs && indexEnd > totalDocs) indexEnd = totalDocs

  const { plural, singular } =
    collectionLabelsFromProps || (collection ? defaultCollectionLabels[collection] : undefined) || defaultLabels

  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {(typeof totalDocs === 'undefined' || totalDocs === 0) && 'No results.'}
      {typeof totalDocs !== 'undefined' &&
        totalDocs > 0 &&
        `Showing ${indexStart}${indexStart > 0 ? ` to ${indexEnd}` : ''} of ${totalDocs} ${
          totalDocs > 1 ? plural : singular
        }`}
    </p>
  )
}
