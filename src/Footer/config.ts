import type { CollectionConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'

/** One footer per tenant; see Header for the `isGlobal` note. */
export const Footer: CollectionConfig = {
  slug: 'footer',
  labels: { singular: 'Footer', plural: 'Footer' },
  access: {
    read: () => true,
  },
  admin: {
    group: 'Site',
  },
  fields: [
    {
      name: 'tagline',
      type: 'text',
      admin: { description: 'One line under the brand, e.g. "Vacation rentals on the Emerald Coast".' },
    },
    {
      name: 'navItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 8,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/Footer/RowLabel#RowLabel',
        },
      },
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'phone', type: 'text' },
        {
          name: 'address',
          type: 'textarea',
          admin: { description: 'One line per row, shown as written.' },
        },
        { name: 'hours', type: 'textarea', admin: { description: 'One line per row.' } },
      ],
    },
    {
      name: 'copyright',
      type: 'text',
      admin: { description: 'Shown after the © and the current year.' },
    },
  ],
  hooks: {
    afterChange: [revalidateFooter],
  },
}
