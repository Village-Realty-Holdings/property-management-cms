'use client'

import type { ComponentType } from 'react'

import { AmenitiesBlock } from '@/blocks/Amenities/Component'
import { AreaGuideBlock } from '@/blocks/AreaGuide/Component'
import { BookingStepsBlock } from '@/blocks/BookingSteps/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FAQBlock } from '@/blocks/FAQ/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { GalleryBlock } from '@/blocks/Gallery/Component'
import { HeroBlock } from '@/blocks/Hero/Component'
import { LocationBlock } from '@/blocks/Location/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { NewsletterBlock } from '@/blocks/Newsletter/Component'
import { OwnerCtaBlock } from '@/blocks/OwnerCta/Component'
import { PricingBlock } from '@/blocks/Pricing/Component'
import { SectionBlock } from '@/blocks/Section/Component'
import { TestimonialsBlock } from '@/blocks/Testimonials/Component'

/**
 * Blocks the editor can render in the browser, by slug. These are the same
 * components the public page uses, so the canvas and the add-block preview
 * are the site.
 *
 * Blocks that read live data on the server (property search, reviews, post
 * archives) are async server components and cannot run in the browser; they
 * are absent here and get a labelled placeholder instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBlock = ComponentType<any>

export const clientBlocks: Record<string, AnyBlock> = {
  amenities: AmenitiesBlock,
  areaGuide: AreaGuideBlock,
  bookingSteps: BookingStepsBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  faq: FAQBlock,
  formBlock: FormBlock,
  gallery: GalleryBlock,
  hero: HeroBlock,
  location: LocationBlock,
  mediaBlock: MediaBlock,
  newsletter: NewsletterBlock,
  ownerCta: OwnerCtaBlock,
  pricing: PricingBlock,
  section: SectionBlock,
  testimonials: TestimonialsBlock,
}

export function Placeholder({ label }: { label: string }) {
  return (
    <div className="container">
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center">
        <p className="text-lg font-semibold">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Fills in from live data on the site. Use Preview to see it; edit its settings in the
          sidebar.
        </p>
      </div>
    </div>
  )
}

/** Renders a block by slug with the given props, or the placeholder for server-only blocks. */
export function BlockView({
  slug,
  label,
  props,
}: {
  slug: string
  label: string
  props: Record<string, unknown>
}) {
  const Block = clientBlocks[slug]
  if (!Block) return <Placeholder label={label} />
  return <Block {...props} blockType={slug} disableInnerContainer />
}
