'use client'
import type { PropertyListingBlock } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<NonNullable<PropertyListingBlock['codes']>[number]>()
  return <div>{data?.code || `Unit ${rowNumber !== undefined ? rowNumber + 1 : ''}`}</div>
}
