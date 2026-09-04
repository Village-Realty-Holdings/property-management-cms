import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'
import { cn } from '@/lib/ui'

type Props = CTABlockProps & {
  /** Set when rendered inside a Section slot, which supplies its own container. */
  disableInnerContainer?: boolean
}

export const CallToActionBlock: React.FC<Props> = ({ links, richText, disableInnerContainer }) => {
  return (
    <div className={cn(!disableInnerContainer && 'container')}>
      <div className="surface flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        {richText && (
          <RichText
            className="max-w-[40rem] prose-h2:text-subtitle prose-h3:text-subtitle prose-p:text-muted-foreground"
            data={richText}
            enableGutter={false}
          />
        )}
        {links && links.length > 0 && (
          <div className="flex shrink-0 flex-col gap-3">
            {links.map(({ link }, i) => (
              <CMSLink key={i} size="lg" {...link} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
