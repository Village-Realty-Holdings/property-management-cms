import React from 'react'

import type { HeroBlock } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

/** Copy first, then a wide photo. */
export const MediumImpactHero: React.FC<HeroBlock> = ({ links, media, richText }) => {
  return (
    <section className="container pt-12 md:pt-20">
      <div className="max-w-[44rem]">
        {richText && (
          <RichText
            data={richText}
            enableGutter={false}
            className="prose-h1:text-display prose-h2:text-title prose-p:text-lead prose-p:text-muted-foreground max-w-none"
          />
        )}
        {Array.isArray(links) && links.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-3">
            {links.map(({ link }, i) => (
              <li key={i}>
                <CMSLink {...link} size="lg" />
              </li>
            ))}
          </ul>
        )}
      </div>

      {media && typeof media === 'object' && (
        <figure className="mt-10 md:mt-14">
          <Media
            priority
            resource={media}
            imgClassName="aspect-[16/9] w-full rounded-xl object-cover md:aspect-[21/9]"
          />
          {media.caption && (
            <figcaption className="mt-3 text-sm text-muted-foreground">
              <RichText data={media.caption} enableGutter={false} enableProse={false} />
            </figcaption>
          )}
        </figure>
      )}
    </section>
  )
}
