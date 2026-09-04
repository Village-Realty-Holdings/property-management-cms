import type { Block } from 'payload'

export const propertyTypeOptions = [
  { label: 'Condo', value: 'condo' },
  { label: 'House', value: 'house' },
  { label: 'Townhome', value: 'townhome' },
  { label: 'Cabin', value: 'cabin' },
  { label: 'Villa', value: 'villa' },
]

export const propertySortOptions = [
  { label: 'Featured first', value: 'featured' },
  { label: 'Random (stable per page)', value: 'random' },
  { label: 'Name A–Z', value: 'name-asc' },
  { label: 'Bedrooms, most first', value: 'bedrooms-desc' },
  { label: 'Bedrooms, fewest first', value: 'bedrooms-asc' },
  { label: 'Sleeps, most first', value: 'sleeps-desc' },
  { label: 'Nightly rate, low to high', value: 'rate-asc' },
  { label: 'Nightly rate, high to low', value: 'rate-desc' },
  { label: 'Best rated', value: 'rating-desc' },
  { label: 'Most availability', value: 'availability-desc' },
]

export const PropertyListing: Block = {
  slug: 'propertyListing',
  interfaceName: 'PropertyListingBlock',
  labels: { singular: 'Property Listing', plural: 'Property Listings' },
  admin: {
    group: 'Property',
    images: { thumbnail: '/admin/blocks/propertyListing.svg' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Featured rentals',
    },
    {
      name: 'intro',
      type: 'textarea',
      admin: { description: 'Optional short text under the heading.' },
    },
    {
      name: 'source',
      type: 'radio',
      defaultValue: 'query',
      admin: { layout: 'horizontal' },
      options: [
        { label: 'Filter', value: 'query' },
        { label: 'Hand-picked units', value: 'codes' },
      ],
    },
    {
      name: 'codes',
      type: 'array',
      label: 'Units',
      minRows: 1,
      admin: {
        condition: (_data, siblingData) => siblingData?.source === 'codes',
        description: 'Unit codes from the booking system, shown in this order.',
        components: { RowLabel: '@/blocks/PropertyListing/RowLabel#RowLabel' },
      },
      fields: [{ name: 'code', type: 'text', required: true }],
    },
    {
      name: 'query',
      type: 'group',
      admin: { condition: (_data, siblingData) => siblingData?.source === 'query' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'nodeId',
              type: 'text',
              label: 'Location (node id)',
              admin: {
                width: '50%',
                description: 'Region, area or complex id. Includes everything under it.',
              },
            },
            {
              name: 'types',
              type: 'select',
              hasMany: true,
              label: 'Property types',
              options: propertyTypeOptions,
              admin: { width: '50%', description: 'Empty means any type.' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'bedrooms',
              type: 'number',
              label: 'Min bedrooms',
              min: 0,
              admin: { width: '25%' },
            },
            {
              name: 'guests',
              type: 'number',
              label: 'Min sleeps',
              min: 0,
              admin: { width: '25%' },
            },
            {
              name: 'pets',
              type: 'checkbox',
              label: 'Pet friendly only',
              admin: { width: '25%' },
            },
            {
              name: 'featuredOnly',
              type: 'checkbox',
              label: 'Featured only',
              admin: { width: '25%' },
            },
          ],
        },
        {
          name: 'amenityIds',
          type: 'text',
          hasMany: true,
          label: 'Required amenities',
          admin: {
            description: 'Amenity ids the unit must have, e.g. beachfront, pool, pets.',
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'sort',
              type: 'select',
              defaultValue: 'featured',
              options: propertySortOptions,
              admin: { width: '50%' },
            },
            {
              name: 'limit',
              type: 'number',
              defaultValue: 6,
              min: 1,
              max: 48,
              admin: { width: '50%' },
            },
          ],
        },
        {
          name: 'followSearchParams',
          type: 'checkbox',
          label: 'Follow the URL search',
          admin: {
            description:
              'Turn on for the results page of an Availability Search block. Dates, guests, bedrooms and location from the URL narrow this filter.',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'view',
          type: 'select',
          defaultValue: 'grid',
          options: [
            { label: 'Grid', value: 'grid' },
            { label: 'Carousel', value: 'carousel' },
          ],
          admin: { width: '50%' },
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
          admin: {
            width: '50%',
            condition: (_data, siblingData) => siblingData?.view !== 'carousel',
          },
        },
      ],
    },
    {
      name: 'detailPage',
      type: 'relationship',
      relationTo: 'pages',
      admin: {
        description:
          'Page holding a Property Detail block set to "From the URL". Cards link there with the unit code. Leave empty for plain cards.',
      },
    },
    {
      name: 'emptyMessage',
      type: 'text',
      defaultValue: 'No rentals match. Try different dates or fewer filters.',
    },
  ],
}
