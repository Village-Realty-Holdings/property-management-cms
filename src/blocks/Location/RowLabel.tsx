'use client'
import type { LocationBlock } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<NonNullable<LocationBlock['nearby']>[number]>()
  const label = data?.name || `Place ${rowNumber !== undefined ? rowNumber + 1 : ''}`
  return <div>{label}</div>
}
