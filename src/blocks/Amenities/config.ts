import type { Block } from 'payload'

export const amenityIconOptions = [
  { label: 'Wi-Fi', value: 'wifi' },
  { label: 'Parking', value: 'parking' },
  { label: 'Pool', value: 'pool' },
  { label: 'Gym', value: 'gym' },
  { label: 'Kitchen', value: 'kitchen' },
  { label: 'Laundry', value: 'laundry' },
  { label: 'Air conditioning', value: 'airConditioning' },
  { label: 'Heating', value: 'heating' },
  { label: 'Pet friendly', value: 'petFriendly' },
  { label: 'TV', value: 'tv' },
  { label: 'Elevator', value: 'elevator' },
  { label: 'Balcony', value: 'balcony' },
  { label: 'Security', value: 'security' },
  { label: 'Garden', value: 'garden' },
  { label: 'BBQ', value: 'bbq' },
  { label: 'Beach access', value: 'beach' },
] as const

export const Amenities: Block = {
  slug: 'amenities',
  interfaceName: 'AmenitiesBlock',
  labels: { singular: 'Amenities', plural: 'Amenities' },
  admin: {
    group: 'Property',
    images: { thumbnail: '/admin/blocks/amenities.svg' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Amenities',
    },
    {
      name: 'columns',
      type: 'select',
      defaultValue: '3',
      options: [
        { label: '2 columns', value: '2' },
        { label: '3 columns', value: '3' },
        { label: '4 columns', value: '4' },
      ],
      admin: { description: 'Number of columns on desktop; stacks on small screens.' },
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      admin: {
        initCollapsed: false,
        components: { RowLabel: '@/blocks/Amenities/RowLabel#RowLabel' },
      },
      fields: [
        {
          name: 'icon',
          type: 'select',
          defaultValue: 'wifi',
          options: [...amenityIconOptions],
          admin: { description: 'Icon shown next to the label.' },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'note',
          type: 'text',
          admin: { description: 'Optional short note, e.g. "Free", "Shared", "On request".' },
        },
      ],
    },
  ],
}
