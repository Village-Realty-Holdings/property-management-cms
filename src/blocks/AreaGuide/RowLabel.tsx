'use client'
import type { AreaGuideBlock } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<NonNullable<AreaGuideBlock['items']>[number]>()
  return <div>{data?.title || `Place ${rowNumber !== undefined ? rowNumber + 1 : ''}`}</div>
}
