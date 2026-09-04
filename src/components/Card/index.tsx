'use client'
import { cn } from '@/lib/ui'
import useClickableCard from '@/hooks/useClickableCard'
import Link from 'next/link'
import React from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'

export type CardPostData = Pick<Post, 'slug' | 'categories' | 'meta' | 'title'>

export const Card: React.FC<{
  className?: string
  doc?: CardPostData
  relationTo?: 'posts'
  showCategories?: boolean
  title?: string
}> = (props) => {
  const { card, link } = useClickableCard({})
  const { className, doc, relationTo, showCategories, title: titleFromProps } = props

  const { slug, categories, meta, title } = doc || {}
  const { description, image: metaImage } = meta || {}

  const categoryTitles = showCategories
    ? (categories ?? []).flatMap((c) => (typeof c === 'object' && c.title ? [c.title] : []))
    : []
  const titleToUse = titleFromProps || title
  const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  const href = `/${relationTo}/${slug}`

  return (
    <article
      className={cn(
        'group surface flex flex-col overflow-hidden hover:cursor-pointer has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/40',
        className,
      )}
      ref={card.ref}
    >
      <div className="aspect-[3/2] w-full overflow-hidden bg-muted">
        {metaImage && typeof metaImage !== 'string' && (
          <Media resource={metaImage} size="33vw" imgClassName="size-full object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {categoryTitles.length > 0 && (
          <p className="text-sm text-muted-foreground">{categoryTitles.join(', ')}</p>
        )}
        {titleToUse && (
          <h3 className="text-subtitle">
            <Link className="outline-none" href={href} ref={link.ref}>
              {titleToUse}
            </Link>
          </h3>
        )}
        {description && <p className="text-sm text-muted-foreground">{sanitizedDescription}</p>}
      </div>
    </article>
  )
}
