'use client'
import type { BookingStepsBlock } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<NonNullable<BookingStepsBlock['steps']>[number]>()
  const n = rowNumber !== undefined ? rowNumber + 1 : ''
  return <div>{data?.title ? `${n}. ${data.title}` : `Step ${n}`}</div>
}
