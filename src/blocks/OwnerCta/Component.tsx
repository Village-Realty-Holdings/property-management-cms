import React from 'react'
import { Check } from 'lucide-react'

import type { OwnerCtaBlock as Props } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import { cn } from '@/lib/ui'

export const OwnerCtaBlock: React.FC<Props & { disableInnerContainer?: boolean }> = ({
  eyebrow,
  heading,
  text,
  benefits,
  image,
  links,
  tone,
}) => {
  const hasImage = image && typeof image === 'object'
  return (
    <div className="container">
      <div
        className={cn(
          'grid gap-8 overflow-hidden rounded border p-8 md:p-12',
          hasImage && 'md:grid-cols-2 md:items-center',
          tone === 'plain'
            ? 'border-border bg-card'
            : 'border-primary/20 bg-primary text-primary-foreground',
        )}
      >
        <div className="flex flex-col gap-4">
          {eyebrow && <span className="text-xs font-medium uppercase tracking-wide opacity-80">{eyebrow}</span>}
          <h2 className="text-3xl font-semibold md:text-4xl">{heading}</h2>
          {text && <p className={cn('text-lg', tone === 'plain' ? 'text-muted-foreground' : 'opacity-90')}>{text}</p>}
          {benefits && benefits.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {benefits.map((b, i) => (
                <li key={b.id ?? i} className="flex gap-2 text-sm">
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
                  appearance={tone === 'plain' ? link.appearance : i === 0 ? 'secondary' : 'outline'}
                />
              ))}
            </div>
          )}
        </div>
        {hasImage && (
          <Media resource={image} imgClassName="aspect-[4/3] w-full rounded object-cover" />
        )}
      </div>
    </div>
  )
}
