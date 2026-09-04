'use client'

import React, { useEffect } from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { useHeaderTheme } from '@/providers/HeaderTheme'

/**
 * Full-bleed photo with the copy anchored bottom-left. Sits behind the
 * header, which turns transparent over it, and leaves room at the bottom
 * for a search block to overlap the edge.
 */
export const HighImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  const { setOverHero } = useHeaderTheme()

  useEffect(() => {
    setOverHero(true)
  }, [setOverHero])

  return (
    <section
      className="relative -mt-header flex min-h-[min(88svh,52rem)] items-end overflow-hidden bg-foreground text-white"
      data-surface="inverted"
    >
      {media && typeof media === 'object' && (
        <Media fill className="absolute inset-0" imgClassName="object-cover" priority resource={media} />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10"
      />

      <div className="container relative pt-header pb-32 md:pb-40">
        <div className="max-w-[44rem]">
          {richText && (
            <RichText
              data={richText}
              enableGutter={false}
              className="max-w-none text-white prose-headings:text-white prose-h1:text-display prose-h2:text-display prose-h1:mb-5 prose-p:mt-0 prose-p:text-lead prose-p:text-white/85 prose-strong:text-white"
            />
          )}
          {Array.isArray(links) && links.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-3">
              {links.map(({ link }, i) => (
                <li key={i}>
                  <CMSLink
                    {...link}
                    size="lg"
                    appearance={i === 0 ? 'inverse' : 'inverse-outline'}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
