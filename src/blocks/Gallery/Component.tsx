import React from 'react'

import type { GalleryBlock as GalleryBlockProps } from '@/payload-types'

import { Media } from '@/components/Media'
import { SectionHeader } from '@/components/SectionHeader'
import { cn } from '@/lib/ui'

type GalleryImage = NonNullable<GalleryBlockProps['images']>[number]

const Figure: React.FC<{ item: GalleryImage; className?: string; imgClassName?: string }> = ({
  item,
  className,
  imgClassName,
}) => {
  const { image, caption } = item
  if (!image || typeof image !== 'object') return null

  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <Media resource={image} imgClassName={cn('w-full rounded-lg bg-muted object-cover', imgClassName)} />
      {caption && <figcaption className="text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  )
}

export const GalleryBlock: React.FC<GalleryBlockProps> = ({ heading, layout = 'grid', images }) => {
  const items = images ?? []
  if (items.length === 0) return null

  let body: React.ReactNode
  switch (layout) {
    case 'masonry':
      body = (
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {items.map((item, i) => (
            <Figure key={i} item={item} className="mb-4 break-inside-avoid" />
          ))}
        </div>
      )
      break
    case 'strip':
      body = (
        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 md:-mx-8 md:px-8">
          {items.map((item, i) => (
            <Figure
              key={i}
              item={item}
              className="w-[80vw] shrink-0 snap-start sm:w-[24rem]"
              imgClassName="aspect-[4/3] h-auto"
            />
          ))}
        </div>
      )
      break
    default: {
      const featureFirst = items.length >= 5
      body = (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <Figure
              key={i}
              item={item}
              className={cn(featureFirst && i === 0 && 'col-span-2 row-span-2')}
              imgClassName="aspect-[4/3] h-full"
            />
          ))}
        </div>
      )
    }
  }

  return (
    <div className="container">
      <SectionHeader heading={heading} />
      {body}
    </div>
  )
}
