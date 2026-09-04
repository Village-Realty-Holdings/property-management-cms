'use server'

import React from 'react'

import type { PropertyDetailBlock } from '@/payload-types'

import { PropertyDetailView } from '@/blocks/PropertyDetail/View'
import { getPropertyProvider } from './index'

/** Renders the Property Detail view for a unit chosen at request time (from the URL). */
export async function renderPropertyDetail(
  code: string,
  props: PropertyDetailBlock,
): Promise<React.ReactNode> {
  const property = await getPropertyProvider().getByCode(code)
  if (!property) {
    return React.createElement(
      'div',
      { className: 'container' },
      React.createElement(
        'p',
        { className: 'rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground' },
        "This rental isn't available right now.",
      ),
    )
  }
  return React.createElement(PropertyDetailView, { ...props, property })
}
