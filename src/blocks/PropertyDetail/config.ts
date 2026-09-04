import type { Block } from 'payload'

export const PropertyDetail: Block = {
  slug: 'propertyDetail',
  interfaceName: 'PropertyDetailBlock',
  labels: { singular: 'Property Detail', plural: 'Property Details' },
  admin: {
    group: 'Property',
    images: { thumbnail: '/admin/blocks/propertyDetail.svg' },
  },
  fields: [
    {
      name: 'source',
      type: 'radio',
      defaultValue: 'code',
      admin: { layout: 'horizontal' },
      options: [
        { label: 'A specific unit', value: 'code' },
        { label: 'From the URL (?unit=CODE)', value: 'param' },
      ],
    },
    {
      name: 'code',
      type: 'text',
      label: 'Unit code',
      admin: {
        condition: (_data, siblingData) => siblingData?.source === 'code',
        description: 'The unit code in the booking system, e.g. WS-A312.',
      },
    },
    {
      name: 'sections',
      type: 'select',
      hasMany: true,
      defaultValue: ['photos', 'summary', 'description', 'amenities', 'reasons', 'rates', 'reviews'],
      options: [
        { label: 'Photos', value: 'photos' },
        { label: 'Summary (beds, baths, sleeps, location)', value: 'summary' },
        { label: 'Description', value: 'description' },
        { label: 'Amenities by group', value: 'amenities' },
        { label: 'Reasons to book', value: 'reasons' },
        { label: 'Rates and policies', value: 'rates' },
        { label: 'Guest reviews', value: 'reviews' },
        { label: 'Virtual tour links', value: 'tours' },
        { label: 'Current promotions', value: 'promos' },
      ],
      admin: { description: 'Which parts to show, in this fixed order.' },
    },
    {
      name: 'bookLabel',
      type: 'text',
      defaultValue: 'Check availability',
    },
    {
      name: 'bookUrl',
      type: 'text',
      admin: {
        description:
          'Where the book button goes. "{code}" is replaced with the unit code. Empty hides the button.',
      },
    },
  ],
}
