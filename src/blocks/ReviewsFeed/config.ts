import type { Block } from 'payload'

export const ReviewsFeed: Block = {
  slug: 'reviewsFeed',
  interfaceName: 'ReviewsFeedBlock',
  labels: { singular: 'Guest Reviews Feed', plural: 'Guest Reviews Feeds' },
  admin: {
    group: 'Property',
    images: { thumbnail: '/admin/blocks/reviewsFeed.svg' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'What guests are saying',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'propertyCode',
          type: 'text',
          label: 'Only this unit',
          admin: { width: '50%', description: 'Leave empty for reviews across all rentals.' },
        },
        {
          name: 'minRating',
          type: 'number',
          min: 1,
          max: 5,
          defaultValue: 4,
          admin: { width: '25%', description: 'Hide reviews below this.' },
        },
        {
          name: 'limit',
          type: 'number',
          min: 1,
          max: 24,
          defaultValue: 6,
          admin: { width: '25%' },
        },
      ],
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Carousel', value: 'carousel' },
      ],
    },
    {
      name: 'showUnit',
      type: 'checkbox',
      label: 'Show which rental each review is about',
      defaultValue: true,
    },
    {
      name: 'showSummary',
      type: 'checkbox',
      label: 'Show the average rating and count',
      defaultValue: true,
    },
  ],
}
