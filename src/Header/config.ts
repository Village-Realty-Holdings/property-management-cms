import type { CollectionConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'

/**
 * One header per tenant. The multi-tenant plugin marks this collection
 * `isGlobal`, so the admin shows it as a single document per tenant.
 */
export const Header: CollectionConfig = {
  slug: 'header',
  labels: { singular: 'Header', plural: 'Header' },
  access: {
    read: () => true,
  },
  admin: {
    group: 'Site',
  },
  fields: [
    {
      name: 'brand',
      type: 'text',
      admin: {
        description: 'Site name shown in place of the logo. Leave empty to show the logo.',
      },
    },
    {
      name: 'navItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 6,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/Header/RowLabel#RowLabel',
        },
      },
    },
    {
      name: 'ctaLink',
      type: 'group',
      label: 'Button',
      admin: { description: 'Optional highlighted button at the end of the nav, e.g. "Book now".' },
      fields: [
        { name: 'label', type: 'text' },
        { name: 'url', type: 'text' },
        { name: 'newTab', type: 'checkbox', label: 'Open in new tab' },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
