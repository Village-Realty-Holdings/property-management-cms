'use client'
import type { OwnerCtaBlock } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<NonNullable<OwnerCtaBlock['benefits']>[number]>()
  return <div>{data?.text || `Benefit ${rowNumber !== undefined ? rowNumber + 1 : ''}`}</div>
}
