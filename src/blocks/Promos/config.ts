import type { Block } from 'payload'

export const Promos: Block = {
  slug: 'promos',
  interfaceName: 'PromosBlock',
  labels: { singular: 'Promotions', plural: 'Promotions' },
  admin: {
    group: 'Property',
    images: { thumbnail: '/admin/blocks/promos.svg' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Current specials',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'nodeId',
          type: 'text',
          label: 'Location (node id)',
          admin: { width: '50%', description: 'Only offers valid in this region or area.' },
        },
        {
          name: 'limit',
          type: 'number',
          min: 1,
          max: 12,
          defaultValue: 3,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'ctaLabel',
      type: 'text',
      defaultValue: 'Book now',
    },
    {
      name: 'ctaPage',
      type: 'relationship',
      relationTo: 'pages',
      admin: { description: 'Where each offer\'s button goes, usually the search page.' },
    },
  ],
}
