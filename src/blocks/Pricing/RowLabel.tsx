'use client'
import type { RowLabelProps } from '@payloadcms/ui'
import { useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<{ name?: string; price?: number }>()

  const fallback = `Plan ${rowNumber !== undefined ? rowNumber + 1 : ''}`
  const label =
    data?.name || data?.price !== undefined
      ? `${data?.name ?? fallback} · ${data?.price ?? ''}`.trim()
      : fallback

  return <div>{label}</div>
}

export const FeatureRowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<{ text?: string }>()

  return <div>{data?.text || `Feature ${rowNumber !== undefined ? rowNumber + 1 : ''}`}</div>
}
