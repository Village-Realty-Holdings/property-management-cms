import React from 'react'

import type { ContentBlock as ContentBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import RichText from '@/components/RichText'
import { cn } from '@/lib/ui'

const colSpanClasses = {
  full: 'lg:col-span-12',
  half: 'lg:col-span-6',
  oneThird: 'lg:col-span-4',
  twoThirds: 'lg:col-span-8',
}

type Props = ContentBlockProps & {
  /** Set when rendered inside a Section slot, which supplies its own container. */
  disableInnerContainer?: boolean
}

export const ContentBlock: React.FC<Props> = ({ columns, disableInnerContainer }) => {
  if (!columns?.length) return null

  return (
    <div className={cn(!disableInnerContainer && 'container')}>
      <div className="grid grid-cols-4 gap-x-8 gap-y-10 lg:grid-cols-12 lg:gap-x-12">
        {columns.map((col, index) => {
          const { enableLink, link, richText, size } = col
          return (
            <div
              key={index}
              className={cn('col-span-4 flex flex-col gap-6', colSpanClasses[size ?? 'full'], {
                'md:col-span-2': size !== 'full',
              })}
            >
              {richText && <RichText data={richText} enableGutter={false} />}
              {enableLink && <CMSLink {...link} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
