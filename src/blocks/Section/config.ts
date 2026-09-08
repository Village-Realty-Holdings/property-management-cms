import type { Block, Field } from 'payload'

import { CallToAction } from '@/blocks/CallToAction/config'
import { Content } from '@/blocks/Content/config'
import { FormBlock } from '@/blocks/Form/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'

const slotBlocks = [Content, MediaBlock, CallToAction, FormBlock]

type Layout = 'single' | 'twoColumns' | 'mediaLeft' | 'mediaRight' | 'threeCards'

const slot = (name: string, label: string, layouts: Layout[], description: string, defaultValue?: { blockType: string }[]): Field => ({
  name,
  type: 'blocks',
  label,
  blocks: slotBlocks,
  maxRows: 3,
  defaultValue,
  admin: {
    description,
    initCollapsed: false,
    condition: (_data, siblingData) => layouts.includes(siblingData?.layout),
  },
})

export const Section: Block = {
  slug: 'section',
  interfaceName: 'SectionBlock',
  labels: {
    singular: 'Section',
    plural: 'Sections',
  },
  admin: {
    group: 'Layout',
    images: {
      thumbnail: '/admin/blocks/section.svg',
    },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Section heading',
      admin: {
        description: 'Optional title shown above the section content.',
      },
    },
    {
      name: 'subheading',
      type: 'textarea',
      defaultValue: 'A sentence that sets up what this section is about.',
      admin: {
        description: 'Optional short intro shown under the heading.',
      },
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'single',
      options: [
        { label: 'Single column', value: 'single' },
        { label: 'Two columns', value: 'twoColumns' },
        { label: 'Media left, content right', value: 'mediaLeft' },
        { label: 'Content left, media right', value: 'mediaRight' },
        { label: 'Three cards', value: 'threeCards' },
      ],
      admin: {
        description:
          'Pick a shape, then fill its slots. Slots that the shape does not use are hidden.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'width',
          type: 'select',
          defaultValue: 'container',
          options: [
            { label: 'Container', value: 'container' },
            { label: 'Wide', value: 'wide' },
            { label: 'Full width', value: 'full' },
          ],
          admin: {
            description: 'How wide the section content can grow.',
          },
        },
        {
          name: 'padding',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
            { label: 'Large', value: 'lg' },
          ],
          admin: {
            description: 'Vertical space above and below the section.',
          },
        },
      ],
    },
    {
      name: 'background',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Muted', value: 'muted' },
        { label: 'Image', value: 'image' },
      ],
      admin: {
        description: 'Background behind the whole section.',
      },
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Shown behind the section when Background is set to Image.',
        condition: (_data, siblingData) => siblingData?.background === 'image',
      },
    },
    slot(
      'main',
      'Main',
      ['single', 'twoColumns', 'mediaLeft', 'mediaRight', 'threeCards'],
      'Primary content. In media layouts this is the text side; in Three cards this is the first card.',
      [{ blockType: 'content' }],
    ),
    slot(
      'secondary',
      'Secondary',
      ['twoColumns', 'mediaLeft', 'mediaRight', 'threeCards'],
      'Second column. In media layouts this is the media side; in Three cards this is the second card.',
    ),
    slot('third', 'Third', ['threeCards'], 'Third card.'),
  ],
}
