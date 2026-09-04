import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { isSuperAdmin } from '../access/isSuperAdmin'
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
  ],
  hooks: {
    afterChange: [revalidateTenants],
    afterDelete: [revalidateTenants],
  },
  timestamps: true,
}
