'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
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
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          Choose a rental to see its details.{' '}
          <Link href="/rentals" className="font-medium text-primary underline-offset-4 hover:underline">
            Browse rentals
          </Link>
        </p>
      </div>
    )
  }

  if (tree?.code !== code) {
    return (
      <div className="container" aria-busy="true">
        <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" />
        <div className="mt-6 aspect-[3/2] w-full animate-pulse rounded-lg bg-muted md:aspect-[3/1]" />
      </div>
    )
  }

  return <>{tree.node}</>
}
