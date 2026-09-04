import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { isSuperAdmin } from '../access/isSuperAdmin'

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
  ],
  timestamps: true,
}
