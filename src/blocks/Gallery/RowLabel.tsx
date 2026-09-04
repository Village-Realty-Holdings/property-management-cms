'use client'
import type { GalleryBlock } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<NonNullable<GalleryBlock['images']>[number]>()

  const label = data?.caption || `Image ${rowNumber !== undefined ? rowNumber + 1 : ''}`

  return <div>{label}</div>
}
