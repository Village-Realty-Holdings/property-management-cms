import type { BannerBlock as BannerBlockProps } from 'src/payload-types'

import { cn } from '@/lib/ui'
import React from 'react'
import RichText from '@/components/RichText'

type Props = {
  className?: string
} & BannerBlockProps

export const BannerBlock: React.FC<Props> = ({ className, content, style }) => {
  return (
    <div className={cn('my-6 w-full', className)}>
      <div
        className={cn('flex items-center rounded-lg border px-5 py-3 text-sm', {
          'border-border bg-muted/60': style === 'info',
          'border-error bg-error/15': style === 'error',
          'border-success bg-success/15': style === 'success',
          'border-warning bg-warning/15': style === 'warning',
        })}
      >
        <RichText data={content} enableGutter={false} enableProse={false} />
      </div>
    </div>
  )
}
