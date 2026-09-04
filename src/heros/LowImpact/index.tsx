import React from 'react'

import type { Page } from '@/payload-types'

import RichText from '@/components/RichText'

type LowImpactHeroType =
  | {
      children?: React.ReactNode
      richText?: never
    }
  | (Omit<Page['hero'], 'richText'> & {
      children?: never
      richText?: Page['hero']['richText']
    })

/** A page title and a short intro, nothing else. */
export const LowImpactHero: React.FC<LowImpactHeroType> = ({ children, richText }) => {
  return (
    <section className="container pt-12 md:pt-20">
      <div className="max-w-[44rem]">
        {children ||
          (richText && (
            <RichText
              data={richText}
              enableGutter={false}
              className="prose-h1:text-display prose-h2:text-title prose-p:text-lead prose-p:text-muted-foreground max-w-none"
            />
          ))}
      </div>
    </section>
  )
}
