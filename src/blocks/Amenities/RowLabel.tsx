'use client'
import type { AmenitiesBlock } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<NonNullable<AmenitiesBlock['items']>[number]>()
  const label = data?.label || `Amenity ${rowNumber !== undefined ? rowNumber + 1 : ''}`
  return <div>{label}</div>
}
