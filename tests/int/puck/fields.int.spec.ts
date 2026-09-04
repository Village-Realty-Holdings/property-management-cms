import { describe, expect, it, vi } from 'vitest'

// Puck's field components touch browser globals at import time.
vi.hoisted(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

import { isInlineText, toPuckField } from '@/puck/fields'

describe('visual editor inline text', () => {
  it('makes prose text and textarea fields editable on the canvas', () => {
    expect(toPuckField({ kind: 'scalar', name: 'heading', label: 'Heading', type: 'text' })).toMatchObject({ type: 'text', contentEditable: true })
    expect(toPuckField({ kind: 'scalar', name: 'intro', label: 'Intro', type: 'textarea' })).toMatchObject({ type: 'textarea', contentEditable: true })
  })

  it('keeps links, ids and address parts in the sidebar', () => {
    for (const name of ['url', 'linkUrl', 'email', 'slug', 'nodeId', 'promoCode', 'street', 'postalCode', 'country']) {
      expect(isInlineText(name), name).toBe(false)
      expect(toPuckField({ kind: 'scalar', name, label: name, type: 'text' })).toMatchObject({ type: 'text', contentEditable: false })
    }
  })

  it('leaves hasMany text and json fields sidebar-only', () => {
    expect(toPuckField({ kind: 'scalar', name: 'amenityIds', label: 'Amenities', type: 'text', hasMany: true })).toMatchObject({ type: 'custom' })
    expect(toPuckField({ kind: 'scalar', name: 'data', label: 'Data', type: 'json' })).not.toHaveProperty('contentEditable')
  })
})
