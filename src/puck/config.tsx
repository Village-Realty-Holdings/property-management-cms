'use client'

import type { ComponentConfig, Config } from '@puckeditor/core'
import type { ComponentType, ReactNode } from 'react'

import { AmenitiesBlock } from '@/blocks/Amenities/Component'
import { AreaGuideBlock } from '@/blocks/AreaGuide/Component'
import { BookingStepsBlock } from '@/blocks/BookingSteps/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FAQBlock } from '@/blocks/FAQ/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { GalleryBlock } from '@/blocks/Gallery/Component'
import { LocationBlock } from '@/blocks/Location/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { NewsletterBlock } from '@/blocks/Newsletter/Component'
import { OwnerCtaBlock } from '@/blocks/OwnerCta/Component'
import { PricingBlock } from '@/blocks/Pricing/Component'
import { SectionBlock } from '@/blocks/Section/Component'
import { TestimonialsBlock } from '@/blocks/Testimonials/Component'

import { defaultProps } from './adapters'
import { toBlockFields } from './fields'
import type { BlockSchema } from './schema'

/**
 * Builds the Puck config from the block schema the server derived from the
 * Pages `layout` field. Blocks render with the same components the public
 * page uses, so the canvas is the site.
 *
 * Blocks that read live data on the server (property search, reviews, post
 * archives) are async server components and cannot run in the browser; they
 * show a labelled placeholder on the canvas and render for real in Preview.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlock = ComponentType<any>

const clientBlocks: Record<string, AnyBlock> = {
  amenities: AmenitiesBlock,
  areaGuide: AreaGuideBlock,
  bookingSteps: BookingStepsBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  faq: FAQBlock,
  formBlock: FormBlock,
  gallery: GalleryBlock,
  location: LocationBlock,
  mediaBlock: MediaBlock,
  newsletter: NewsletterBlock,
  ownerCta: OwnerCtaBlock,
  pricing: PricingBlock,
  section: SectionBlock,
  testimonials: TestimonialsBlock,
}

/** Puck's viewport presets, kept identical to the admin Live Preview breakpoints. */
export const viewports = [
  { width: 375, height: 667, label: 'Mobile', icon: 'Smartphone' as const },
  { width: 768, height: 1024, label: 'Tablet', icon: 'Tablet' as const },
  { width: 1440, height: 900, label: 'Desktop', icon: 'Monitor' as const },
]

function Placeholder({ label }: { label: string }) {
  return (
    <div className="container">
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center">
        <p className="text-lg font-semibold">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">Fills in from live data on the site. Use Preview to see it; edit its settings in the sidebar.</p>
      </div>
    </div>
  )
}

export function buildPuckConfig(schemas: BlockSchema[]): Config {
  const components: Record<string, ComponentConfig> = {}
  const categories: Record<string, { title: string; components: string[] }> = {}

  for (const schema of schemas) {
    const Block = clientBlocks[schema.slug]
    components[schema.slug] = {
      label: schema.label,
      fields: toBlockFields(schema.fields),
      defaultProps: defaultProps(schema.fields),
      render: ({ puck: _puck, editMode: _editMode, ...props }) => (
        <div className="my-16">
          {Block ? <Block {...props} blockType={schema.slug} disableInnerContainer /> : <Placeholder label={schema.label} />}
        </div>
      ),
    }
    const group = schema.group ?? 'Blocks'
    const key = group.toLowerCase().replace(/\s+/g, '-')
    categories[key] ??= { title: group, components: [] }
    categories[key].components.push(schema.slug)
  }

  return {
    categories,
    root: {
      fields: {},
      render: ({ children }: { children?: ReactNode }) => (
        <article className="min-h-screen bg-background pt-16 pb-24 text-foreground">{children}</article>
      ),
    },
    components,
  }
}
