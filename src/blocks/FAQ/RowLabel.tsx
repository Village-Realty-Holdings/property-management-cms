'use client'
import type { RowLabelProps } from '@payloadcms/ui'
import { useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<{ question?: string }>()

  return <div>{data?.question || `Question ${rowNumber !== undefined ? rowNumber + 1 : ''}`}</div>
}
