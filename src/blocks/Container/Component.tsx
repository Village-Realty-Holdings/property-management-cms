import React from 'react'

import type { ContainerBlock as ContainerBlockProps } from '@/payload-types'

import { Media } from '@/components/Media'
import { cn } from '@/lib/ui'

type Props = ContainerBlockProps & {
  /** Nested containers fill their parent; only the outermost applies a page width. */
  nested?: boolean
  /**
   * The rendered children. RenderBlocks passes the nested blocks, the visual
   * editor a Puck drop zone; the component itself never renders `blocks`, so
   * it stays free of server-only block imports.
   */
  slot?: React.ReactNode | ((className: string) => React.ReactNode)
  className?: string
}

const widthClass = {
  container: 'container',
  wide: 'container max-w-none',
  full: 'w-full px-5 md:px-8',
}
const paddingClass = {
  none: 'py-0',
  sm: 'py-8 md:py-10',
  md: 'py-14 md:py-20',
  lg: 'py-20 md:py-28',
}
const gapClass = {
  none: 'gap-0',
  sm: 'gap-4 md:gap-5',
  md: 'gap-8 md:gap-10',
  lg: 'gap-12 md:gap-16',
}
const alignClass = {
  stretch: 'items-stretch',
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
}
const justifyClass = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
}

export const ContainerBlock: React.FC<Props> = ({
  direction,
  gap,
  align,
  justify,
  width,
  padding,
  background,
  backgroundImage,
  blocks: _blocks,
  nested,
  slot,
  className,
}) => {
  const isRow = direction === 'row'
  const bodyClassName = cn(
    'flex min-w-0',
    isRow ? 'flex-col md:flex-row [&>*]:min-w-0 md:[&>*]:flex-1' : 'flex-col',
    gapClass[gap ?? 'md'],
    alignClass[align ?? 'stretch'],
    justifyClass[justify ?? 'start'],
    'w-full',
  )
  // The editor's drop zone must be the flex parent of the children too.
  const body =
    typeof slot === 'function' ? slot(bodyClassName) : <div className={bodyClassName}>{slot}</div>

  const image = background === 'image' && backgroundImage && typeof backgroundImage === 'object'
  const outer = cn(
    background === 'muted' && 'bg-muted/60',
    background === 'surface' && 'surface p-6',
    image && 'relative overflow-hidden text-white',
    paddingClass[padding ?? 'none'],
    className,
  )

  return (
    <div className={outer} data-surface={image ? 'inverted' : undefined}>
      {image && (
        <>
          <Media
            className="absolute inset-0"
            fill
            imgClassName="object-cover"
            resource={backgroundImage}
          />
          <div aria-hidden className="absolute inset-0 bg-black/55" />
        </>
      )}
      <div className={cn('relative', nested ? 'w-full' : widthClass[width ?? 'container'])}>
        {body}
      </div>
    </div>
  )
}
