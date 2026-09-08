import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { paragraph, richTextDefault } from '@/fields/richTextDefault'

export const Location: Block = {
  slug: 'location',
  interfaceName: 'LocationBlock',
  labels: { singular: 'Location', plural: 'Locations' },
  admin: {
    group: 'Property',
    images: { thumbnail: '/admin/blocks/location.svg' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Location',
    },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text', defaultValue: '123 Ocean Drive' },
        { name: 'city', type: 'text', defaultValue: 'Seaside' },
        { name: 'region', type: 'text', label: 'State / Region', defaultValue: 'CA' },
        { name: 'postalCode', type: 'text', defaultValue: '90000' },
        { name: 'country', type: 'text', defaultValue: 'USA' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'latitude',
          type: 'number',
          min: -90,
          max: 90,
          admin: {
            width: '50%',
            description:
              'Right-click the spot in Google Maps and click the coordinates to copy them. First number is latitude.',
          },
        },
        {
          name: 'longitude',
          type: 'number',
          min: -180,
          max: 180,
          admin: {
            width: '50%',
            description: 'Second number from the Google Maps coordinates.',
          },
        },
      ],
    },
    {
      name: 'zoom',
      type: 'number',
      defaultValue: 14,
      min: 1,
      max: 19,
      admin: {
        description:
          'Map zoom level: 1 is the whole world, 14 a neighbourhood, 19 a single building.',
      },
    },
    {
      name: 'showMap',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Embed an OpenStreetMap map. Requires latitude and longitude.' },
    },
    {
      name: 'nearby',
      type: 'array',
      defaultValue: [
        { name: 'Beach', distance: '5 min walk' },
        { name: 'Grocery store', distance: '3 min drive' },
        { name: 'Airport', distance: '40 min drive' },
      ],
      admin: {
        initCollapsed: false,
        components: { RowLabel: '@/blocks/Location/RowLabel#RowLabel' },
        description: 'Points of interest close to the property.',
      },
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'distance',
          type: 'text',
          admin: { description: 'e.g. "5 min walk", "2 km".' },
        },
      ],
    },
    {
      name: 'notes',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
      defaultValue: richTextDefault([paragraph('Free parking on the driveway. The door code arrives by text on the morning of arrival.')]),
      admin: { description: 'Optional directions, access instructions or neighbourhood notes.' },
    },
  ],
}
