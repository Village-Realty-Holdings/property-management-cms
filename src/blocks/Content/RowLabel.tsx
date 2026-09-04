'use client'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

import type { ContentBlock } from '@/payload-types'

const sizeLabels: Record<string, string> = {
  full: 'Full width',
  half: 'Half',
  oneThird: 'One third',
  twoThirds: 'Two thirds',
}

type Column = NonNullable<ContentBlock['columns']>[number]

/** Plain text of the first lexical paragraph, for a readable collapsed row. */
const firstLine = (children: unknown): string => {
  if (!Array.isArray(children)) return ''
  const first = children[0] as { children?: unknown } | undefined
  if (!Array.isArray(first?.children)) return ''
  return first.children
    .map((child: { text?: unknown }) => (typeof child?.text === 'string' ? child.text : ''))
    .join('')
    .trim()
}

/** Shows the column width and the first line of its text so collapsed rows stay readable. */
export const RowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<Column>()
  const n = rowNumber !== undefined ? rowNumber + 1 : ''
  const firstText = firstLine(data?.richText?.root?.children)
  const size = sizeLabels[data?.size ?? ''] ?? ''
  return (
    <div>
      Column {n}
      {size ? ` · ${size}` : ''}
      {firstText ? ` · ${firstText.slice(0, 40)}` : ''}
    </div>
  )
}
