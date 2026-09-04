import type { StaticImageData } from 'next/image'

import { cn } from '@/lib/ui'
import React from 'react'
import RichText from '@/components/RichText'

import type { MediaBlock as MediaBlockProps } from '@/payload-types'

import { Media } from '@/components/Media'

type Props = MediaBlockProps & {
  captionClassName?: string
  className?: string
  enableGutter?: boolean
  imgClassName?: string
  staticImage?: StaticImageData
  disableInnerContainer?: boolean
}

export const MediaBlock: React.FC<Props> = (props) => {
  const { captionClassName, className, enableGutter = true, imgClassName, media, staticImage, disableInnerContainer } =
    props

  const caption = media && typeof media === 'object' ? media.caption : undefined

  return (
    <figure className={cn(enableGutter && !disableInnerContainer && 'container', className)}>
      {(media || staticImage) && (
        <Media imgClassName={cn('w-full rounded-lg bg-muted', imgClassName)} resource={media} src={staticImage} />
      )}
      {caption && (
        <figcaption className={cn('mt-3 text-sm text-muted-foreground', captionClassName)}>
          <RichText data={caption} enableGutter={false} enableProse={false} />
        </figcaption>
      )}
    </figure>
  )
}
