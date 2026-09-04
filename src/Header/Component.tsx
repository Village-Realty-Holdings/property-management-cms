import { HeaderClient } from './Component.client'
import { getTenantGlobal } from '@/server/getGlobals'
import React from 'react'

export async function Header() {
  const headerData = await getTenantGlobal('header', 1)

  return <HeaderClient data={headerData} />
}
