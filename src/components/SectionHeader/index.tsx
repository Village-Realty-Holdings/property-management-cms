import React from 'react'

import { cn } from '@/lib/ui'

type Props = {
  heading?: string | null
  intro?: string | null
  /** Content aligned to the end of the row, such as a rating summary or a link. */
  aside?: React.ReactNode
  align?: 'start' | 'center'
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}

/**
 * The heading and intro that opens a block. Every block uses this so the
 * type scale, measure and spacing stay the same from section to section.
 */
export const SectionHeader: React.FC<Props> = ({
  heading,
  intro,
  aside,
  align = 'start',
  as: Heading = 'h2',
  className,
}) => {
  if (!heading && !intro) return null

  const centered = align === 'center'

  return (
    <header
      className={cn(
        'mb-8 flex flex-col gap-4 md:mb-10',
        aside && 'md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className={cn('max-w-[40rem]', centered && 'mx-auto text-center')}>
        {heading && <Heading className={cn('text-title', Heading === 'h1' && 'text-display')}>{heading}</Heading>}
        {intro && <p className="mt-3 text-lead text-muted-foreground">{intro}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  )
}
