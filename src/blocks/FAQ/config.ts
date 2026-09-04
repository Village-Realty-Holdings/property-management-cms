import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

export const FAQ: Block = {
  slug: 'faq',
  interfaceName: 'FAQBlock',
  labels: {
    singular: 'FAQ',
    plural: 'FAQs',
  },
  admin: {
    group: 'Capture',
    images: {
      thumbnail: '/admin/blocks/faq.svg',
    },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Frequently asked questions',
    },
    {
      name: 'intro',
      type: 'textarea',
      admin: {
        description: 'Optional short paragraph under the heading.',
      },
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      admin: {
        initCollapsed: false,
        description:
          'Each item renders as an expandable question. Also emitted as FAQPage structured data for search engines.',
        components: {
          RowLabel: '@/blocks/FAQ/RowLabel#RowLabel',
        },
      },
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
        },
        {
          name: 'answer',
          type: 'richText',
          required: true,
          editor: lexicalEditor({
            features: ({ rootFeatures }) => [
              ...rootFeatures,
              HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
              FixedToolbarFeature(),
              InlineToolbarFeature(),
            ],
          }),
        },
      ],
    },
  ],
}
