'use client'

import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import React, { useEffect } from 'react'

type Props = {
  id: number | string
  name: string
}

/**
 * Shows the pinned tenant and keeps the plugin's selection in step with it.
 * The plugin reads its `payload-tenant` cookie to fill the hidden tenant field
 * on create, so forcing the selection here is what locks the forms.
 */
export const TenantLockClient: React.FC<Props> = ({ id, name }) => {
  const { options, selectedTenantID, setTenant } = useTenantSelection()

  const allowed = options.some((option) => String(option.value) === String(id))
  const inSync = String(selectedTenantID) === String(id)

  useEffect(() => {
    if (allowed && !inSync) setTenant({ id, refresh: true })
  }, [allowed, id, inSync, setTenant])

  return (
    <div className="tenant-lock" data-state={allowed ? 'locked' : 'denied'}>
      <span className="tenant-lock__label">Tenant</span>
      <span className="tenant-lock__name">
        <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
          <rect height="10" rx="2" stroke="currentColor" strokeWidth="2" width="16" x="4" y="11" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" />
        </svg>
        {name}
      </span>
      {!allowed && <span className="tenant-lock__note">Your account is not assigned to this tenant.</span>}
    </div>
  )
}
