import React from 'react'

import type { SectionBlock as SectionBlockProps } from '@/payload-types'

import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { Media } from '@/components/Media'
import { SectionHeader } from '@/components/SectionHeader'
import { cn } from '@/lib/ui'

type SlotBlocks = SectionBlockProps['main']

const slotComponents = {
  content: ContentBlock,
  cta: CallToActionBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
}

const RenderSlot: React.FC<{ blocks?: SlotBlocks; className?: string }> = ({ blocks, className }) => {
  if (!blocks || blocks.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {blocks.map((block, index) => {
        const { blockType } = block
        if (blockType && blockType in slotComponents) {
          const Block = slotComponents[blockType as keyof typeof slotComponents]
          return (
            <div key={index}>
              {/* @ts-expect-error there may be some mismatch between the expected types here */}
              <Block {...block} disableInnerContainer />
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

const widthClasses = {
  container: 'container',
  wide: 'container max-w-none',
  full: 'w-full px-5 md:px-8',
}

const paddingClasses = {
  none: 'py-0',
  sm: 'py-8 md:py-10',
  md: 'py-14 md:py-20',
  lg: 'py-20 md:py-28',
}

export const SectionBlock: React.FC<SectionBlockProps> = (props) => {
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

  const hasBackgroundImage = background === 'image' && backgroundImage && typeof backgroundImage === 'object'

  let body: React.ReactNode
  switch (layout) {
    case 'twoColumns':
      body = (
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
          <RenderSlot blocks={main} />
          <RenderSlot blocks={secondary} />
        </div>
      )
      break
    case 'mediaLeft':
      body = (
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-12 lg:gap-16">
          <RenderSlot blocks={secondary} className="md:col-span-5" />
          <RenderSlot blocks={main} className="md:col-span-7" />
        </div>
      )
      break
    case 'mediaRight':
      body = (
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-12 lg:gap-16">
          <RenderSlot blocks={main} className="md:col-span-7" />
          <RenderSlot blocks={secondary} className="md:col-span-5" />
        </div>
      )
      break
    case 'threeCards':
      body = (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          <RenderSlot blocks={main} className="surface p-6" />
          <RenderSlot blocks={secondary} className="surface p-6" />
          <RenderSlot blocks={third} className="surface p-6" />
        </div>
      )
      break
    default:
      body = <RenderSlot blocks={main} />
  }

  const inner = (
    <div className={cn(widthClasses[width ?? 'container'], 'relative')}>
      <SectionHeader heading={heading} intro={subheading} />
      {body}
    </div>
  )

  const paddingClass = paddingClasses[padding ?? 'md']

  if (hasBackgroundImage) {
    return (
      <div className={cn('relative overflow-hidden text-white', paddingClass)} data-surface="inverted">
        <Media fill resource={backgroundImage} imgClassName="object-cover" className="absolute inset-0" />
        <div aria-hidden="true" className="absolute inset-0 bg-black/55" />
        {inner}
      </div>
    )
  }

  return <div className={cn(paddingClass, background === 'muted' && 'bg-muted/60')}>{inner}</div>
}
