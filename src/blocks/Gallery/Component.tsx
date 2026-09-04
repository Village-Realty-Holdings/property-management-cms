import React from 'react'

import type { GalleryBlock as GalleryBlockProps } from '@/payload-types'

import { Media } from '@/components/Media'
import { cn } from '@/lib/ui'

type Props = GalleryBlockProps & { disableInnerContainer?: boolean }

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
      <Media
        resource={image}
        imgClassName={cn('w-full rounded border border-border object-cover', imgClassName)}
      />
      {caption && <figcaption className="text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  )
}

export const GalleryBlock: React.FC<Props> = ({ heading, layout = 'grid', images }) => {
  const items = images ?? []
  if (items.length === 0) return null

  let body: React.ReactNode
  switch (layout) {
    case 'masonry':
      body = (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
          {items.map((item, i) => (
            <Figure key={i} item={item} className="mb-4 break-inside-avoid" />
          ))}
        </div>
      )
      break
    case 'strip':
      body = (
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4">
          {items.map((item, i) => (
            <Figure
              key={i}
              item={item}
              className="shrink-0 snap-start w-[80vw] sm:w-[24rem]"
              imgClassName="aspect-[4/3] h-auto"
            />
          ))}
        </div>
      )
      break
    default: {
      const featureFirst = items.length >= 5
      body = (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item, i) => (
            <Figure
              key={i}
              item={item}
              className={cn({ 'col-span-2 row-span-2': featureFirst && i === 0 })}
              imgClassName="aspect-[4/3] h-full"
            />
          ))}
        </div>
      )
    }
  }

  return (
    <div className="container">
      {heading && <h2 className="mb-8 text-3xl font-semibold">{heading}</h2>}
      {body}
    </div>
  )
}
