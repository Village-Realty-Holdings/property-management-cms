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
        { className: 'rounded border border-dashed border-border p-8 text-center text-muted-foreground' },
        `Unit ${code} is not available right now.`,
      ),
    )
  }
  return React.createElement(PropertyDetailView, { ...props, property })
}
