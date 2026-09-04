import React, { Fragment } from 'react'

import type { Props } from './types'

import { ImageMedia } from './ImageMedia'
import { VideoMedia } from './VideoMedia'

export const Media: React.FC<Props> = (props) => {
  const { className, htmlElement = 'div', resource } = props

  const isVideo = typeof resource === 'object' && resource?.mimeType?.includes('video')
  const media = isVideo ? <VideoMedia {...props} /> : <ImageMedia {...props} />

  if (htmlElement === null) return <Fragment>{media}</Fragment>

  const Tag = htmlElement
  return <Tag className={className}>{media}</Tag>
}
