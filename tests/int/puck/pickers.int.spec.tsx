import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { CustomField } from '@puckeditor/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

import { toPuckField } from '@/puck/fields'

/**
 * The relation and media pickers in the visual editor sidebar. They fetch
 * documents through the REST API as the logged-in user; here fetch is stubbed
 * with a couple of pages and posts.
 */

const docs: Record<string, unknown[]> = {
  pages: [
    { id: 1, title: 'Home', slug: 'home' },
    { id: 2, title: 'About', slug: 'about' },
  ],
  posts: [{ id: 7, title: 'Summer offers', slug: 'summer' }],
  media: [
    { id: 11, alt: 'Pool', url: '/pool.jpg' },
    { id: 12, alt: 'Beach', url: '/beach.jpg' },
  ],
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const collection = /\/api\/([^?]+)/.exec(input)?.[1] ?? ''
      return new Response(JSON.stringify({ docs: docs[collection] ?? [] }), { status: 200 })
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

type Rendered = { onChange: ReturnType<typeof vi.fn>; rerender: (value: unknown) => void }

function renderField(field: CustomField<unknown>, value: unknown): Rendered {
  const onChange = vi.fn()
  const Render = field.render as React.FC<{
    field: CustomField<unknown>
    value: unknown
    onChange: (v: unknown) => void
    id: string
    name: string
  }>
  const el = (v: unknown) => <Render field={field} id="f" name="f" onChange={onChange} value={v} />
  const utils = render(el(value))
  return { onChange, rerender: (v) => utils.rerender(el(v)) }
}

const flush = () => act(async () => {})

describe('relationship picker', () => {
  it('is a picker even when hasMany or polymorphic', () => {
    for (const relationTo of ['pages', ['pages', 'posts']] as const) {
      for (const hasMany of [false, true]) {
        const field = toPuckField({ kind: 'relation', name: 'ref', label: 'Ref', type: 'relationship', relationTo: relationTo as string | string[], hasMany })
        expect(field).toMatchObject({ type: 'custom' })
      }
    }
  })

  it('offers each collection as a group and stores a polymorphic value', async () => {
    const field = toPuckField({ kind: 'relation', name: 'reference', label: 'Document', type: 'relationship', relationTo: ['pages', 'posts'] }) as CustomField<unknown>
    const { onChange } = renderField(field, null)
    await flush()
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.querySelectorAll('optgroup')).toHaveLength(2)
    expect(screen.getByRole('option', { name: 'Summer offers' })).toBeTruthy()

    fireEvent.change(select, { target: { value: 'posts:7' } })
    expect(onChange).toHaveBeenCalledWith({ relationTo: 'posts', value: expect.objectContaining({ id: 7, title: 'Summer offers' }) })
  })

  it('shows the current polymorphic value as selected', async () => {
    const field = toPuckField({ kind: 'relation', name: 'reference', label: 'Document', type: 'relationship', relationTo: ['pages', 'posts'] }) as CustomField<unknown>
    renderField(field, { relationTo: 'pages', value: { id: 2, title: 'About' } })
    await flush()
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('pages:2')
  })

  it('toggles hasMany relations as checkboxes and keeps the rest', async () => {
    const field = toPuckField({ kind: 'relation', name: 'categories', label: 'Categories', type: 'relationship', relationTo: 'pages', hasMany: true }) as CustomField<unknown>
    const { onChange } = renderField(field, [{ id: 1, title: 'Home' }])
    await flush()
    const about = screen.getByLabelText('About') as HTMLInputElement
    expect((screen.getByLabelText('Home') as HTMLInputElement).checked).toBe(true)
    expect(about.checked).toBe(false)

    fireEvent.click(about)
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })])

    fireEvent.click(screen.getByLabelText('Home'))
    expect(onChange).toHaveBeenLastCalledWith([])
  })
})

describe('media picker', () => {
  it('adds and removes images for a hasMany upload', async () => {
    const field = toPuckField({ kind: 'relation', name: 'images', label: 'Images', type: 'upload', relationTo: 'media', hasMany: true }) as CustomField<unknown>
    const { onChange, rerender } = renderField(field, [])
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }))
    await flush()

    fireEvent.click(screen.getByTitle('Pool'))
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 11 })])

    rerender([docs.media[0]])
    // The list stays open for more picks; the chosen image gets a remove control.
    fireEvent.click(screen.getByTitle('Beach'))
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 11 }), expect.objectContaining({ id: 12 })])

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('still replaces and closes for a single upload', async () => {
    const field = toPuckField({ kind: 'relation', name: 'image', label: 'Image', type: 'upload', relationTo: 'media' }) as CustomField<unknown>
    const { onChange } = renderField(field, null)
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }))
    await flush()
    fireEvent.click(screen.getByTitle('Beach'))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 12 }))
    expect(screen.queryByTitle('Pool')).toBeNull()
  })
})
