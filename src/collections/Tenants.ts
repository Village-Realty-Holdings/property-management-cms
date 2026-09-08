import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { isSuperAdmin } from '../access/isSuperAdmin'
import { isHexColor } from '../lib/adminBranding'
import { revalidateTenants } from './hooks/revalidateTenants'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    create: isSuperAdmin,
    delete: isSuperAdmin,
    read: authenticated,
    update: isSuperAdmin,
  },
  admin: {
    defaultColumns: ['name', 'slug'],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Short identifier for this tenant, used in URLs and integrations.',
      },
    },
    {
      name: 'domains',
      type: 'array',
      admin: {
        description:
          'Hostnames that serve this tenant on the frontend, e.g. warrenbeachrentals.com or localhost. The first tenant is the fallback when nothing matches.',
      },
      fields: [{ name: 'domain', type: 'text', required: true }],
    },
    {
      name: 'branding',
      type: 'group',
      admin: {
        description:
          'How the admin panel looks when it is opened on one of the domains above. Anything left empty falls back to the Awayday brand.',
      },
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Wordmark shown on the login screen. Wide, on a transparent background.' },
        },
        {
          name: 'icon',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Square mark shown in the admin navigation.' },
        },
        {
          name: 'accentColor',
          type: 'text',
          admin: {
            description: 'Hex colour for buttons and highlights, e.g. #2d4447.',
            placeholder: '#2d4447',
          },
          validate: (value: null | string | undefined) =>
            !value || isHexColor(value) || 'Enter a hex colour such as #2d4447.',
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateTenants],
    afterDelete: [revalidateTenants],
  },
  timestamps: true,
}
