import type { Block } from 'payload'

export const AvailabilitySearch: Block = {
  slug: 'availabilitySearch',
  interfaceName: 'AvailabilitySearchBlock',
  labels: { singular: 'Availability Search', plural: 'Availability Searches' },
  admin: {
    group: 'Property',
    images: { thumbnail: '/admin/blocks/availabilitySearch.svg' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Find your stay',
      admin: { description: 'Shown above the form. Leave empty inside a hero.' },
    },
    {
      name: 'resultsPage',
      type: 'relationship',
      relationTo: 'pages',
      required: true,
      admin: {
        description:
          'The page that holds a Property Listing block with "Follow the URL search" turned on. The form sends dates and guests there.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'showBedrooms',
          type: 'checkbox',
          label: 'Bedrooms field',
          defaultValue: true,
          admin: { width: '33%' },
        },
        {
          name: 'showNode',
          type: 'checkbox',
          label: 'Location field',
          defaultValue: true,
          admin: { width: '33%', description: 'Lists areas and complexes from the booking system.' },
        },
        {
          name: 'showPets',
          type: 'checkbox',
          label: 'Pets toggle',
          defaultValue: false,
          admin: { width: '33%' },
        },
      ],
    },
    {
      name: 'nodeScope',
      type: 'text',
      admin: {
        description:
          'Optional. Only offer locations under this node id (e.g. a region, so a tenant never sees another tenant\'s areas). Leave empty to list everything.',
      },
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'bar',
      options: [
        { label: 'Bar (one row, for heroes)', value: 'bar' },
        { label: 'Card (stacked, for sidebars)', value: 'card' },
      ],
    },
    {
      name: 'buttonLabel',
      type: 'text',
      defaultValue: 'Search',
    },
  ],
}
