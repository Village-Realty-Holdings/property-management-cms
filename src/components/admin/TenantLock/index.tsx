import type { ComponentProps } from 'react'

import { TenantSelector } from '@payloadcms/plugin-multi-tenant/rsc'
import React from 'react'

import { findTenantByHost } from '@/server/getTenant'
import { TenantLockClient } from './Client'

type Props = ComponentProps<typeof TenantSelector>

/**
 * Replaces the multi-tenant plugin's nav selector. When the admin is opened on
 * a domain that belongs to a tenant, that tenant is pinned: the name is shown
 * at the top of the nav and the plugin's selection cookie is forced to match,
 * so every document created here is inserted under it. On any other host
 * (localhost, the Awayday domain) the plugin's own selector is rendered and
 * super admins choose as before.
 */
export const TenantLock: React.FC<Props> = async (props) => {
  const tenant = await findTenantByHost()

  if (!tenant) return <TenantSelector {...props} />

  return <TenantLockClient id={tenant.id} name={tenant.name} />
}
