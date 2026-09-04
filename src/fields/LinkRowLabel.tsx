'use client'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

type LinkRow = { link?: { label?: string | null } | null }

export const LinkRowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<LinkRow>()
  const n = rowNumber !== undefined ? rowNumber + 1 : ''
  return <div>{data?.link?.label || `Link ${n}`}</div>
}
