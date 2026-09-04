'use client'
import { SiteSetting } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<NonNullable<NonNullable<SiteSetting['social']>['socialLinks']>[number]>()

  const label = data?.data?.platform
    ? `Social ${data.rowNumber !== undefined ? data.rowNumber + 1 : ''}: ${data?.data?.platform}`
    : 'Row'

  return <div>{label}</div>
}
