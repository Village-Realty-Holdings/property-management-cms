import type { Block, Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { link } from '@/fields/link'
import { heading, paragraph, richTextDefault } from '@/fields/richTextDefault'

const columnFields: Field[] = [
  {
    name: 'size',
    type: 'select',
    defaultValue: 'full',
    admin: {
      description: 'Columns wrap onto a new row when their widths add up past full.',
    },
    options: [
      {
        label: 'One Third',
        value: 'oneThird',
      },
      {
        label: 'Half',
        value: 'half',
      },
      {
        label: 'Two Thirds',
        value: 'twoThirds',
      },
      {
        label: 'Full',
        value: 'full',
      },
    ],
  },
  {
    name: 'richText',
    type: 'richText',
    editor: lexicalEditor({
      features: ({ rootFeatures }) => {
        return [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ]
      },
    }),
    label: false,
    defaultValue: richTextDefault([
      heading('A heading for this section', 'h2'),
      paragraph('Write a paragraph or two here. Keep it short and specific: what the home is like, who it suits and what makes the area worth the trip.'),
    ]),
  },
  {
    name: 'enableLink',
    type: 'checkbox',
    label: 'Add a link below the text',
  },
  link({
    overrides: {
      admin: {
        condition: (_data, siblingData) => {
          return Boolean(siblingData?.enableLink)
        },
      },
    },
  }),
]

export const Content: Block = {
  slug: 'content',
  interfaceName: 'ContentBlock',
  labels: {
    singular: 'Text Columns',
    plural: 'Text Columns',
  },
  admin: {
    group: 'Content',
    images: {
      thumbnail: { url: '/admin/blocks/content.svg', alt: 'Text columns' },
    },
  },
  fields: [
    {
      name: 'columns',
      type: 'array',
      minRows: 1,
      maxRows: 4,
      defaultValue: [{ size: 'full' }],
      admin: {
        initCollapsed: false,
        description: 'One column for plain body copy. Add more to place text side by side.',
        components: {
          RowLabel: '@/blocks/Content/RowLabel#RowLabel',
        },
      },
      fields: columnFields,
    },
  ],
}
