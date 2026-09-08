import type { CollectionConfig } from 'payload'

import { link } from '@/fields/link'
import { generateHomePreviewPath } from '@/seo/generatePreviewPath'
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
    livePreview: { url: generateHomePreviewPath },
    preview: (data, { req }) => generateHomePreviewPath({ data, req }),
  },
  fields: [
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Wordmark shown in the header and footer. Wide, on a transparent background.',
      },
    },
    {
      name: 'brand',
      type: 'text',
      admin: {
        description: 'Site name shown when there is no logo, and read out by screen readers when there is.',
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
