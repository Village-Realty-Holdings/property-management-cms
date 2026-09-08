import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '@/fields/linkGroup'
import { heading, paragraph, richTextDefault } from '@/fields/richTextDefault'

/**
 * The page opener. It is a block like any other so it can be dropped,
 * reordered or removed in the visual editor; a new page starts with one.
 */
export const Hero: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Hero', plural: 'Heroes' },
  admin: {
    group: 'Layout',
    images: { thumbnail: '/admin/blocks/hero.svg' },
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      label: 'Type',
      defaultValue: 'lowImpact',
      required: true,
      options: [
        { label: 'Full-screen photo', value: 'highImpact' },
        { label: 'Text, then photo', value: 'mediumImpact' },
        { label: 'Text only', value: 'lowImpact' },
      ],
      admin: { description: 'Photo types need an image below.' },
    },
    {
      name: 'richText',
      type: 'richText',
      label: false,
      defaultValue: richTextDefault([
        heading('Your next stay starts here', 'h1'),
        paragraph('A line or two about the homes, the area and why guests keep coming back.'),
      ]),
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
    },
    linkGroup({
      overrides: {
        maxRows: 2,
        defaultValue: [{ link: { type: 'custom', url: '/search', label: 'Find a rental', appearance: 'default' } }],
      },
    }),
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        condition: (_, { type } = {}) => ['highImpact', 'mediumImpact'].includes(type),
      },
    },
  ],
}
