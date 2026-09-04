import React from 'react'
import { Star } from 'lucide-react'

import type { TestimonialsBlock as TestimonialsBlockProps } from '@/payload-types'

import { Media } from '@/components/Media'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/ui'

type Props = TestimonialsBlockProps & { disableInnerContainer?: boolean }

type Item = NonNullable<TestimonialsBlockProps['items']>[number]

const Rating: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <div className={cn('flex gap-0.5', className)} aria-label={`${value} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn('size-4', i < value ? 'fill-current' : 'text-muted-foreground')}
        aria-hidden
      />
    ))}
  </div>
)

const Author: React.FC<{ item: Item; centered?: boolean }> = ({ item, centered }) => {
  const { avatar, author, role } = item
  const hasAvatar = avatar && typeof avatar === 'object'

  return (
    <div className={cn('flex items-center gap-3', { 'justify-center': centered })}>
      {hasAvatar && (
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
          <Media resource={avatar} imgClassName="size-full object-cover" fill />
        </div>
      )}
      <div className={cn({ 'text-center': centered && !hasAvatar })}>
        <p className="font-medium">{author}</p>
        {role && <p className="text-sm text-muted-foreground">{role}</p>}
      </div>
    </div>
  )
}

export const TestimonialsBlock: React.FC<Props> = ({ heading, layout, items }) => {
  const list = items || []
  if (list.length === 0) return null

  if (layout === 'single') {
    const item = list[0]
    return (
      <div className="container">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          {heading && <h2 className="text-3xl font-semibold">{heading}</h2>}
          {typeof item.rating === 'number' && <Rating value={item.rating} />}
          <blockquote className="text-2xl font-medium leading-relaxed">
            &ldquo;{item.quote}&rdquo;
          </blockquote>
          <Author item={item} centered />
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {heading && <h2 className="mb-8 text-3xl font-semibold">{heading}</h2>}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {list.map((item, i) => (
          <Card key={item.id || i}>
            <CardContent className="flex h-full flex-col gap-4">
              {typeof item.rating === 'number' && <Rating value={item.rating} />}
              <blockquote className="grow text-base leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <Author item={item} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
