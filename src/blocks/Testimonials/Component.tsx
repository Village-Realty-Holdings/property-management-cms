import React from 'react'

import type { TestimonialsBlock as TestimonialsBlockProps } from '@/payload-types'

import { Media } from '@/components/Media'
import { SectionHeader } from '@/components/SectionHeader'
import { Stars } from '@/components/Stars'
import { cn } from '@/lib/ui'

type Item = NonNullable<TestimonialsBlockProps['items']>[number]

const Author: React.FC<{ item: Item; centered?: boolean }> = ({ item, centered }) => {
  const { avatar, author, role } = item
  const hasAvatar = avatar && typeof avatar === 'object'

  return (
    <div className={cn('flex items-center gap-3', centered && 'justify-center')}>
      {hasAvatar && (
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
          <Media resource={avatar} imgClassName="size-full object-cover" fill />
        </div>
      )}
      <div className={cn('text-sm', centered && !hasAvatar && 'text-center')}>
        <p className="font-medium">{author}</p>
        {role && <p className="text-muted-foreground">{role}</p>}
      </div>
    </div>
  )
}

export const TestimonialsBlock: React.FC<TestimonialsBlockProps> = ({ heading, layout, items }) => {
  const list = items || []
  if (list.length === 0) return null

  if (layout === 'single') {
    const item = list[0]
    return (
      <div className="container">
        <figure className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          {heading && <h2 className="text-subtitle text-muted-foreground">{heading}</h2>}
          {typeof item.rating === 'number' && <Stars value={item.rating} size="md" />}
          <blockquote className="text-title font-medium">&ldquo;{item.quote}&rdquo;</blockquote>
          <figcaption>
            <Author item={item} centered />
          </figcaption>
        </figure>
      </div>
    )
  }

  return (
    <div className="container">
      <SectionHeader heading={heading} />
      <div className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {list.map((item, i) => (
          <figure key={item.id || i} className="surface flex flex-col gap-4 p-5 md:p-6">
            {typeof item.rating === 'number' && <Stars value={item.rating} />}
            <blockquote className="grow">&ldquo;{item.quote}&rdquo;</blockquote>
            <figcaption>
              <Author item={item} />
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
