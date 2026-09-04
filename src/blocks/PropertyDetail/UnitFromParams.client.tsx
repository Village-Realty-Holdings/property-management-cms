'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import type { PropertyDetailBlock as Props } from '@/payload-types'

import { renderPropertyDetail } from '@/server/properties/detail-action'

/**
 * Reads `?unit=CODE` and asks the server to render the detail view for it.
 * The server action returns the finished React tree so the view itself stays
 * a server component with provider access.
 */
export const UnitFromParams: React.FC<Props> = (props) => {
  const params = useSearchParams()
  const code = params.get('unit')
  const [tree, setTree] = useState<{ code: string; node: React.ReactNode } | null>(null)

  useEffect(() => {
    if (!code) return
    let cancelled = false
    renderPropertyDetail(code, props).then((node) => {
      if (!cancelled) setTree({ code, node })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- props are block config, stable per render
  }, [code])

  if (!code) {
    return (
      <div className="container">
        <p className="rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          Pick a rental to see its details.
        </p>
      </div>
    )
  }
  return <>{tree?.code === code ? tree.node : null}</>
}
