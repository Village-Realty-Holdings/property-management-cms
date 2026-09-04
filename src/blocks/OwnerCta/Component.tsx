import React from 'react'
import { Check } from 'lucide-react'

import type { OwnerCtaBlock as Props } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import { cn } from '@/lib/ui'

export const OwnerCtaBlock: React.FC<Props> = ({ eyebrow, heading, text, benefits, image, links, tone }) => {
  const hasImage = image && typeof image === 'object'
  const plain = tone === 'plain'

  const buttonAppearance = (i: number) => {
    if (plain) return undefined
    return i === 0 ? 'inverse' : 'inverse-outline'
  }

  return (
    <div className="container">
      <div
        className={cn(
          'grid gap-10 overflow-hidden rounded-xl p-8 md:p-12 lg:p-16',
          hasImage && 'lg:grid-cols-[1.1fr_1fr] lg:items-center',
          plain ? 'surface rounded-xl' : 'bg-primary text-primary-foreground',
        )}
      >
        <div className="flex flex-col gap-5">
          {eyebrow && <p className={cn('text-sm font-medium', plain ? 'text-primary' : 'text-primary-foreground/80')}>{eyebrow}</p>}
          <h2 className="text-title">{heading}</h2>
          {text && (
            <p className={cn('text-lead', plain ? 'text-muted-foreground' : 'text-primary-foreground/85')}>{text}</p>
          )}
          {benefits && benefits.length > 0 && (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {benefits.map((b, i) => (
                <li key={b.id ?? i} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {b.text}
                </li>
              ))}
            </ul>
          )}
          {links && links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-3">
              {links.map(({ link }, i) => (
                <CMSLink
                  key={i}
                  size="lg"
                  {...link}
                  appearance={buttonAppearance(i) ?? link.appearance}
                />
              ))}
            </div>
          )}
        </div>
        {hasImage && (
          <Media resource={image} imgClassName="aspect-[4/3] w-full rounded-lg object-cover" />
        )}
      </div>
    </div>
  )
}
