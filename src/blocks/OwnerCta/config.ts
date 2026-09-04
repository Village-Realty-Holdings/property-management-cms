import type { Block } from 'payload'

import { linkGroup } from '../../fields/linkGroup'

export const OwnerCta: Block = {
  slug: 'ownerCta',
  interfaceName: 'OwnerCtaBlock',
  labels: { singular: 'Owner CTA', plural: 'Owner CTAs' },
  admin: {
    group: 'Property',
    images: { thumbnail: '/admin/blocks/ownerCta.svg' },
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      defaultValue: 'For owners',
      admin: { description: 'Small label above the heading.' },
    },
    {
      name: 'heading',
      type: 'text',
      required: true,
      defaultValue: 'Own a vacation rental?',
    },
    {
      name: 'text',
      type: 'textarea',
      defaultValue:
        'Find out how much more your home could earn with local, full-service management.',
    },
    {
      name: 'benefits',
      type: 'array',
      maxRows: 6,
      defaultValue: [
        { text: 'Dynamic pricing tuned to local demand' },
        { text: 'Professional photography and listing on every major channel' },
        { text: 'Hotel-standard housekeeping and inspections' },
        { text: 'Owner portal with real-time statements' },
      ],
      admin: { components: { RowLabel: '@/blocks/OwnerCta/RowLabel#RowLabel' } },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional photo beside the text.' },
    },
    linkGroup({
      appearances: ['default', 'outline'],
      overrides: {
        maxRows: 2,
        admin: { description: 'e.g. "Get a free rental projection" and "Owner login".' },
      },
    }),
    {
      name: 'tone',
      type: 'select',
      defaultValue: 'accent',
      options: [
        { label: 'Accent background', value: 'accent' },
        { label: 'Plain card', value: 'plain' },
      ],
    },
  ],
}
