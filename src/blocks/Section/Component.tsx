import React from 'react'

import type { SectionBlock as SectionBlockProps } from '@/payload-types'

import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { Media } from '@/components/Media'
import { cn } from '@/lib/ui'

type Props = SectionBlockProps & { disableInnerContainer?: boolean }

type SlotBlocks = SectionBlockProps['main']

const slotComponents = {
  content: ContentBlock,
  cta: CallToActionBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
}

// Nested block components render their own `.container`; neutralise it inside a slot.
const slotClassName = 'flex flex-col gap-8 [&_.container]:max-w-none [&_.container]:px-0'

const RenderSlot: React.FC<{ blocks?: SlotBlocks; className?: string }> = ({
  blocks,
  className,
}) => {
  if (!blocks || blocks.length === 0) return null

  return (
    <div className={cn(slotClassName, className)}>
      {blocks.map((block, index) => {
        const { blockType } = block
        if (blockType && blockType in slotComponents) {
          const Block = slotComponents[blockType as keyof typeof slotComponents]
          if (Block) {
            return (
              <div key={index}>
                {/* @ts-expect-error there may be some mismatch between the expected types here */}
                <Block {...block} disableInnerContainer />
              </div>
            )
          }
        }
        return null
      })}
    </div>
  )
}

const widthClasses = {
  container: 'container',
  wide: 'max-w-7xl mx-auto px-4',
  full: 'w-full px-4',
}

const paddingClasses = {
  none: 'py-0',
  sm: 'py-8',
  md: 'py-16',
  lg: 'py-24',
}

const cardClassName = 'bg-card rounded border border-border p-6'

export const SectionBlock: React.FC<Props> = (props) => {
  const {
    heading,
    subheading,
    layout = 'single',
    width = 'container',
    background = 'none',
    backgroundImage,
    padding = 'md',
    main,
    secondary,
    third,
  } = props

  const hasBackgroundImage =
    background === 'image' && backgroundImage && typeof backgroundImage === 'object'

  let body: React.ReactNode
  switch (layout) {
    case 'twoColumns':
      body = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
          <RenderSlot blocks={main} />
          <RenderSlot blocks={secondary} />
        </div>
      )
      break
    case 'mediaLeft':
      body = (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-16 items-center">
          <RenderSlot blocks={secondary} className="md:col-span-5" />
          <RenderSlot blocks={main} className="md:col-span-7" />
        </div>
      )
      break
    case 'mediaRight':
      body = (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-16 items-center">
          <RenderSlot blocks={main} className="md:col-span-7" />
          <RenderSlot blocks={secondary} className="md:col-span-5" />
        </div>
      )
      break
    case 'threeCards':
      body = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <RenderSlot blocks={main} className={cardClassName} />
          <RenderSlot blocks={secondary} className={cardClassName} />
          <RenderSlot blocks={third} className={cardClassName} />
        </div>
      )
      break
    default:
      body = <RenderSlot blocks={main} />
  }

  const inner = (
    <div className={cn(widthClasses[width ?? 'container'], 'relative')}>
      {(heading || subheading) && (
        <div className="mb-8 max-w-[48rem]">
          {heading && <h2 className="text-3xl font-semibold">{heading}</h2>}
          {subheading && <p className="mt-2 text-lg text-muted-foreground">{subheading}</p>}
        </div>
      )}
      {body}
    </div>
  )

  const paddingClass = paddingClasses[padding ?? 'md']

  if (hasBackgroundImage) {
    return (
      <div className={cn('relative overflow-hidden', paddingClass)}>
        <Media
          fill
          resource={backgroundImage}
          imgClassName="object-cover"
          className="absolute inset-0 -z-10"
        />
        {inner}
      </div>
    )
  }

  return <div className={cn(paddingClass, { 'bg-muted': background === 'muted' })}>{inner}</div>
}
