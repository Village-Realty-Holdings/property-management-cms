import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/server/getGlobals'
import React from 'react'

export async function Header() {
  const headerData = await getCachedGlobal('header', 1)()

  return <HeaderClient data={headerData} />
}
