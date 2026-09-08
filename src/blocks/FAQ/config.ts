import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { paragraph, richTextDefault } from '@/fields/richTextDefault'

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
      defaultValue: 'Quick answers about booking, arrival and the house rules.',
      admin: {
        description: 'Optional short paragraph under the heading.',
      },
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      defaultValue: [
        { question: 'What time is check-in and check-out?', answer: richTextDefault([paragraph('Check-in is from 4 pm and check-out is by 10 am. Ask us about early or late times; we can often help.')]) },
        { question: 'Is there a minimum stay?', answer: richTextDefault([paragraph('Most homes ask for two nights, and a week in peak season. The calendar shows what applies to your dates.')]) },
        { question: 'Can I bring my dog?', answer: richTextDefault([paragraph('Many of our homes welcome dogs. Filter by pet-friendly when you search, and let us know how many are coming.')]) },
      ],
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
