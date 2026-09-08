import type { Block } from 'payload'

export const Testimonials: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsBlock',
  labels: {
    singular: 'Testimonials',
    plural: 'Testimonials',
  },
  admin: {
    group: 'Content',
    images: {
      thumbnail: '/admin/blocks/testimonials.svg',
    },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'What guests say',
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      admin: {
        description:
          '"Grid" shows every item as a card; "Single" shows only the first item, large and centered.',
      },
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Single', value: 'single' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      defaultValue: [
        { quote: 'Spotless, quiet and two minutes from the sand. We booked again before we left.', author: 'Maria and Tom', role: 'Stayed June 2026', rating: 5 },
        { quote: 'The check-in code arrived on time and the host answered every question within minutes.', author: 'Priya S.', role: 'Stayed April 2026', rating: 5 },
      ],
      admin: {
        initCollapsed: false,
        components: {
          RowLabel: '@/blocks/Testimonials/RowLabel#RowLabel',
        },
      },
      fields: [
        {
          name: 'quote',
          type: 'textarea',
          required: true,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'author',
              type: 'text',
              required: true,
              admin: { width: '50%' },
            },
            {
              name: 'role',
              type: 'text',
              admin: {
                width: '50%',
                description: 'Context under the name, e.g. "Stayed March 2026".',
              },
            },
          ],
        },
        {
          name: 'rating',
          type: 'number',
          min: 1,
          max: 5,
          admin: {
            description: '1 to 5 stars, leave empty to hide',
          },
        },
        {
          name: 'avatar',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Optional photo of the guest.',
          },
        },
      ],
    },
  ],
}
