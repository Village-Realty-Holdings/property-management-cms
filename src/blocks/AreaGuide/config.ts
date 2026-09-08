import type { Block } from 'payload'

export const AreaGuide: Block = {
  slug: 'areaGuide',
  interfaceName: 'AreaGuideBlock',
  labels: { singular: 'Area Guide', plural: 'Area Guides' },
  admin: {
    group: 'Property',
    images: { thumbnail: '/admin/blocks/areaGuide.svg' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Explore the area',
    },
    {
      name: 'intro',
      type: 'textarea',
      defaultValue: 'Beaches, restaurants and things to do, all a short drive from the front door.',
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'cards',
      options: [
        { label: 'Cards', value: 'cards' },
        { label: 'Alternating rows', value: 'rows' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 8,
      defaultValue: [
        { title: 'The beach', category: 'Beaches', text: 'Wide sand, gentle surf and lifeguards in season. Bring a chair and stay for sunset.', distance: '5 min walk' },
        { title: 'Old town', category: 'Dining', text: 'Family-run kitchens, a Saturday market and the best coffee for miles.', distance: '10 min drive' },
        { title: 'Coastal trail', category: 'Things to do', text: 'An easy loop along the cliffs with lookouts every few hundred metres.', distance: '15 min drive' },
      ],
      admin: {
        initCollapsed: false,
        components: { RowLabel: '@/blocks/AreaGuide/RowLabel#RowLabel' },
      },
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'category',
          type: 'text',
          admin: { description: 'e.g. "Beaches", "Dining", "Things to do", "Nightlife".' },
        },
        { name: 'text', type: 'textarea', required: true },
        { name: 'image', type: 'upload', relationTo: 'media' },
        {
          name: 'distance',
          type: 'text',
          admin: { description: 'Optional, e.g. "5 min walk", "12 mi".' },
        },
        {
          name: 'nodeId',
          type: 'text',
          label: 'Rentals node id',
          admin: {
            description:
              'Optional. When set, a "See rentals here" link goes to the search page filtered to this node.',
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'linkUrl',
              type: 'text',
              label: 'Read more URL',
              admin: { width: '60%', description: 'Optional, e.g. a blog post or the town\'s site.' },
            },
            {
              name: 'linkLabel',
              type: 'text',
              label: 'Read more label',
              defaultValue: 'Read more',
              admin: { width: '40%' },
            },
          ],
        },
      ],
    },
    {
      name: 'searchPage',
      type: 'relationship',
      relationTo: 'pages',
      admin: { description: 'Used by the "See rentals here" links. Usually the search results page.' },
    },
  ],
}
