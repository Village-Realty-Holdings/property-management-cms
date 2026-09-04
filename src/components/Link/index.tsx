import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'

import type { Page, Post } from '@/payload-types'

/* Base UI's Button no longer exports a props type; derive it instead. */
type ButtonProps = React.ComponentProps<typeof Button>

type CMSLinkType = {
  appearance?: 'inline' | ButtonProps['variant']
  children?: React.ReactNode
  className?: string
  label?: string | null
  newTab?: boolean | null
  reference?: {
    relationTo: 'pages' | 'posts'
    value: Page | Post | string | number
  } | null
  size?: ButtonProps['size'] | null
  type?: 'custom' | 'reference' | null
  url?: string | null
}

const referenceHref = (reference: CMSLinkType['reference']) => {
  if (typeof reference?.value !== 'object' || !reference.value.slug) return null
  const prefix = reference.relationTo === 'pages' ? '' : `/${reference.relationTo}`
  return `${prefix}/${reference.value.slug}`
}

export const CMSLink: React.FC<CMSLinkType> = (props) => {
  const { type, appearance = 'inline', children, className, label, newTab, reference, size, url } = props

  const href = (type === 'reference' ? referenceHref(reference) : url) ?? url
  if (!href) return null

  const newTabProps = newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {}

  /* Plain anchor, so it doesn't fight styles set by rich text or the caller. */
  if (appearance === 'inline') {
    return (
      <Link className={className} href={href} {...newTabProps}>
        {label}
        {children}
      </Link>
    )
  }

  return (
    <Button
      className={className}
      nativeButton={false}
      render={<Link href={href} {...newTabProps} />}
      size={appearance === 'link' ? 'clear' : size}
      variant={appearance}
    >
      {label}
      {children}
    </Button>
  )
}
