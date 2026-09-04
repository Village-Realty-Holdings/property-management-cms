import type { Block } from 'payload'

export const stepIconOptions = [
  { label: 'Search', value: 'search' },
  { label: 'Calendar', value: 'calendar' },
  { label: 'Credit card', value: 'card' },
  { label: 'Key', value: 'key' },
  { label: 'Home', value: 'home' },
  { label: 'Sun', value: 'sun' },
  { label: 'Phone', value: 'phone' },
  { label: 'Check', value: 'check' },
] as const

export const BookingSteps: Block = {
  slug: 'bookingSteps',
  interfaceName: 'BookingStepsBlock',
  labels: { singular: 'Booking Steps', plural: 'Booking Steps' },
  admin: {
    group: 'Property',
    images: { thumbnail: '/admin/blocks/bookingSteps.svg' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Book in three steps',
    },
    {
      name: 'intro',
      type: 'textarea',
    },
    {
      name: 'steps',
      type: 'array',
      minRows: 2,
      maxRows: 5,
      defaultValue: [
        { icon: 'search', title: 'Pick your dates', text: 'Search real-time availability across every home we manage.' },
        { icon: 'card', title: 'Book securely', text: 'Instant confirmation, transparent fees, no surprises.' },
        { icon: 'key', title: 'Check in with a code', text: 'Your door code arrives the morning of arrival. No front desk.' },
      ],
      admin: {
        initCollapsed: false,
        components: { RowLabel: '@/blocks/BookingSteps/RowLabel#RowLabel' },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'icon',
              type: 'select',
              defaultValue: 'search',
              options: [...stepIconOptions],
              admin: { width: '30%' },
            },
            { name: 'title', type: 'text', required: true, admin: { width: '70%' } },
          ],
        },
        { name: 'text', type: 'textarea', required: true },
      ],
    },
  ],
}
