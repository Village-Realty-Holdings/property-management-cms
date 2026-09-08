import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { isSuperAdmin, isSuperAdminField } from '../../access/isSuperAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
    // GHSA-jg8r-5jh2-v2xj: Payload's default lets any authenticated user unlock other accounts.
    unlock: isSuperAdmin,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['user'],
      options: [
        { label: 'Super Admin', value: 'super-admin' },
        { label: 'User', value: 'user' },
      ],
      access: {
        create: isSuperAdminField,
        update: isSuperAdminField,
      },
      admin: {
        description: 'Super admins see every tenant. Users only see the tenants assigned to them.',
      },
    },
  ],
  timestamps: true,
}
