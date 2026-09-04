import React from 'react'

import type { PropertyDetailBlock as Props } from '@/payload-types'

import { getPropertyProvider } from '@/server/properties'
import { UnitFromParams } from './UnitFromParams.client'
import { PropertyDetailView } from './View'

export const PropertyDetailBlock: React.FC<Props & { disableInnerContainer?: boolean }> = async (props) => {
  if (props.source === 'param') {
    // The unit code lives in the URL, which a server block can't see. Hand off to a client shell.
    return <UnitFromParams {...props} />
  }
  if (!props.code) return null
  const property = await getPropertyProvider().getByCode(props.code)
  if (!property) {
    return (
      <div className="container">
        <p className="rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          Unit {props.code} is not available right now.
        </p>
      </div>
    )
  }
  return <PropertyDetailView property={property} {...props} />
}

