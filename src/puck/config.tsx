'use client'

import type { ComponentConfig, Config, Viewports } from '@puckeditor/core'
import { usePuckSelector as usePuck } from './usePuck'
import type { ComponentType, ReactNode } from 'react'

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

import { defaultProps } from './adapters'
import { EmptyCanvas, InsertStrip, useRootIndex } from './BlockPicker'
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

/**
 * Canvas width presets: the admin Live Preview breakpoints, with desktop as
 * full width. The canvas is not scaled (Puck's drag overlay reads an internal
 * zoom), so a fixed 1440 would overflow the column instead of shrinking.
 */
export const viewports: Viewports = [
  { width: 375, height: 'auto', label: 'Mobile', icon: 'Smartphone' },
  { width: 768, height: 'auto', label: 'Tablet', icon: 'Tablet' },
  { width: '100%', height: 'auto', label: 'Desktop', icon: 'Monitor' },
]

/** A block on the canvas with a "+" strip under it, so the next block can be added by clicking. */
function CanvasBlock({ id, children }: { id: string; children: ReactNode }) {
  const index = useRootIndex(id)
  return (
    <>
      {children}
      {index >= 0 && <InsertStrip index={index + 1} />}
    </>
  )
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

/** The page frame: a "+" strip at the top, or the empty-state card when there are no blocks yet. */
function CanvasRoot({ children }: { children?: ReactNode }) {
  const isEmpty = usePuck((s) => s.appState.data.content.length === 0)
  return (
    <article className="min-h-screen bg-background pt-16 pb-24 text-foreground">
      {isEmpty ? <EmptyCanvas /> : <InsertStrip index={0} />}
      {children}
    </article>
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
        <CanvasBlock id={props.id}>
          <div className="my-16">
            {Block ? (
              <Block {...props} blockType={schema.slug} disableInnerContainer />
            ) : (
              <Placeholder label={schema.label} />
            )}
          </div>
        </CanvasBlock>
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
      // Page settings, shown when nothing on the canvas is selected.
      fields: {
        title: { type: 'text', label: 'Page title' },
        slug: { type: 'text', label: 'URL slug' },
      },
      render: ({ children }: { children?: ReactNode }) => <CanvasRoot>{children}</CanvasRoot>,
    },
    components,
  }
}
