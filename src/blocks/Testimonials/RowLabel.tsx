'use client'
import type { RowLabelProps } from '@payloadcms/ui'
import { useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<{ author?: string }>()

  return <div>{data?.author || `Testimonial ${rowNumber !== undefined ? rowNumber + 1 : ''}`}</div>
}
