import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { AmenitiesBlock } from '@/blocks/Amenities/Component'
import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FAQBlock } from '@/blocks/FAQ/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { GalleryBlock } from '@/blocks/Gallery/Component'
import { LocationBlock } from '@/blocks/Location/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { PricingBlock } from '@/blocks/Pricing/Component'
import { SectionBlock } from '@/blocks/Section/Component'
import { TestimonialsBlock } from '@/blocks/Testimonials/Component'

const blockComponents = {
  amenities: AmenitiesBlock,
  archive: ArchiveBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  faq: FAQBlock,
  formBlock: FormBlock,
  gallery: GalleryBlock,
  location: LocationBlock,
  mediaBlock: MediaBlock,
  pricing: PricingBlock,
  section: SectionBlock,
  testimonials: TestimonialsBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <div className="my-16" key={index}>
                  {/* @ts-expect-error there may be some mismatch between the expected types here */}
                  <Block {...block} disableInnerContainer />
                </div>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
