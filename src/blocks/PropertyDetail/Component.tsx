import React, { Suspense } from 'react'

import type { PropertyDetailBlock as Props } from '@/payload-types'

import { getPropertyProvider } from '@/server/properties'
import { UnitFromParams } from './UnitFromParams.client'
import { PropertyDetailView } from './View'

export const PropertyDetailBlock: React.FC<Props> = async (props) => {
  if (props.source === 'param') {
    // The unit code lives in the URL, which a server block can't see. Hand off to a client shell.
    return (
      <Suspense>
        <UnitFromParams {...props} />
      </Suspense>
    )
  }
  if (!props.code) return null
  const property = await getPropertyProvider().getByCode(props.code)
  if (!property) {
    return (
      <div className="container">
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          This rental isn&apos;t available right now.
        </p>
      </div>
    )
  }
  return <PropertyDetailView property={property} {...props} />
}
