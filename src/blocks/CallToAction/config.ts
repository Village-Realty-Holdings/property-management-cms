import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '../../fields/linkGroup'
import { heading, paragraph, richTextDefault } from '@/fields/richTextDefault'

export const CallToAction: Block = {
  slug: 'cta',
  interfaceName: 'CallToActionBlock',
  fields: [
    {
      name: 'richText',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      label: false,
      defaultValue: richTextDefault([heading('Ready to book your stay?', 'h2'), paragraph('Check live availability or talk to the team about the right home for you.')]),
      admin: {
        description: 'A short heading and one or two sentences. The buttons sit beside it.',
      },
    },
    linkGroup({
      appearances: ['default', 'outline'],
      overrides: {
        maxRows: 2,
        defaultValue: [
          { link: { type: 'custom', url: '/search', label: 'Check availability', appearance: 'default' } },
          { link: { type: 'custom', url: '/contact', label: 'Contact us', appearance: 'outline' } },
        ],
        admin: {
          description: 'Up to two buttons. The first one is the primary action.',
        },
      },
    }),
  ],
  labels: {
    plural: 'Calls to Action',
    singular: 'Call to Action',
  },
  admin: {
    group: 'Capture',
    images: {
      thumbnail: { url: '/admin/blocks/cta.svg', alt: 'Call to action' },
    },
  },
}
