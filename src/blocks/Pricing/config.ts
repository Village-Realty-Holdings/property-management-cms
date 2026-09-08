import type { Block } from 'payload'

import { link } from '@/fields/link'

export const Pricing: Block = {
  slug: 'pricing',
  interfaceName: 'PricingBlock',
  labels: {
    singular: 'Pricing',
    plural: 'Pricing',
  },
  admin: {
    group: 'Property',
    images: {
      thumbnail: '/admin/blocks/pricing.svg',
    },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Rates',
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'USD',
      maxLength: 3,
      admin: {
        description: 'Three-letter ISO currency code, e.g. USD, EUR, MXN.',
      },
    },
    {
      name: 'plans',
      type: 'array',
      minRows: 1,
      maxRows: 4,
      defaultValue: [
        { name: 'Low season', price: 180, period: 'night', description: 'November to March, two-night minimum.', features: [{ text: 'Linen and towels included' }, { text: 'Free parking' }] },
        { name: 'High season', price: 320, period: 'night', description: 'June to August, weekly stays.', highlighted: true, features: [{ text: 'Linen and towels included' }, { text: 'Free parking' }, { text: 'Mid-stay clean' }] },
      ],
      admin: {
        initCollapsed: false,
        description: 'One card per rate or unit type, e.g. "Low season" or "Studio".',
        components: {
          RowLabel: '@/blocks/Pricing/RowLabel#RowLabel',
        },
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'e.g. "Low season", "Studio".',
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'price',
              type: 'number',
              required: true,
              min: 0,
              defaultValue: 0,
              admin: { width: '50%' },
            },
            {
              name: 'period',
              type: 'select',
              defaultValue: 'month',
              admin: {
                width: '50%',
                description: 'What the price covers.',
              },
              options: [
                { label: 'Per night', value: 'night' },
                { label: 'Per week', value: 'week' },
                { label: 'Per month', value: 'month' },
                { label: 'Per year', value: 'year' },
                { label: 'One-time', value: 'once' },
              ],
            },
          ],
        },
        {
          name: 'description',
          type: 'textarea',
          admin: {
            description: 'Short blurb shown under the price.',
          },
        },
        {
          name: 'features',
          type: 'array',
          admin: {
            initCollapsed: false,
            description: 'Bullet points listed on the card.',
            components: {
              RowLabel: '@/blocks/Pricing/RowLabel#FeatureRowLabel',
            },
          },
          fields: [
            {
              name: 'text',
              type: 'text',
              required: true,
            },
          ],
        },
        {
          name: 'highlighted',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Visually emphasise this plan',
          },
        },
        {
          name: 'enableLink',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Add a call-to-action button to this plan.',
          },
        },
        link({
          appearances: ['default', 'outline'],
          overrides: {
            admin: {
              condition: (_d, s) => Boolean(s?.enableLink),
            },
          },
        }),
      ],
    },
    {
      name: 'footnote',
      type: 'text',
      defaultValue: 'Taxes and cleaning fee not included.',
      admin: {
        description: 'Small print below the cards, e.g. "Taxes and cleaning fee not included".',
      },
    },
  ],
}
