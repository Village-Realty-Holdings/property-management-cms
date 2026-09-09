import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { CustomField } from '@puckeditor/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

import { toPuckField } from '@/puck/fields'
import { richTextExcerpt } from '@/puck/richTextContext'

/**
 * The sidebar fields that used to send people to the form view: date, code,
 * JSON and point edit in place; rich text opens a sheet; nested blocks are
 * canvas slots.
 */

afterEach(cleanup)

type Rendered = { onChange: ReturnType<typeof vi.fn>; rerender: (value: unknown) => void }

function renderField(field: CustomField<unknown>, value: unknown, wrap?: (el: React.ReactNode) => React.ReactElement): Rendered {
  const onChange = vi.fn()
  const Render = field.render as React.FC<{
    field: CustomField<unknown>
    value: unknown
    onChange: (v: unknown) => void
    id: string
    name: string
  }>
  const el = (v: unknown) => {
    const node = <Render field={field} id="f" name="f" onChange={onChange} value={v} />
    return wrap ? wrap(node) : node
  }
  const utils = render(el(value))
  return { onChange, rerender: (v) => utils.rerender(el(v)) }
}

describe('json field', () => {
  const field = toPuckField({ kind: 'scalar', name: 'data', label: 'Data', type: 'json' }) as CustomField<unknown>

  it('commits parsed JSON on blur and null when emptied', () => {
    const { onChange } = renderField(field, { a: 1 })
    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(JSON.parse(box.value)).toEqual({ a: 1 })
    fireEvent.change(box, { target: { value: '{"b": [1, 2]}' } })
    fireEvent.blur(box)
    expect(onChange).toHaveBeenLastCalledWith({ b: [1, 2] })
    fireEvent.change(box, { target: { value: '  ' } })
    fireEvent.blur(box)
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('keeps invalid text local and shows the error', () => {
    const { onChange } = renderField(field, null)
    const box = screen.getByRole('textbox')
    fireEvent.change(box, { target: { value: '{oops' } })
    fireEvent.blur(box)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/Not valid JSON/)).toBeTruthy()
  })
})

describe('date field', () => {
  it('stores an ISO string and clears to null', () => {
    const field = toPuckField({ kind: 'scalar', name: 'startsAt', label: 'Starts', type: 'date' }) as CustomField<unknown>
    const { onChange, rerender } = renderField(field, null)
    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '2026-09-08T10:30' } })
    const iso = onChange.mock.calls[0][0] as string
    expect(new Date(iso).getFullYear()).toBe(2026)
    expect(iso.endsWith('Z')).toBe(true)
    rerender(iso)
    expect(input.value).toBe('2026-09-08T10:30')
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})

describe('point field', () => {
  it('stores [longitude, latitude] in that order', () => {
    const field = toPuckField({ kind: 'scalar', name: 'location', label: 'Location', type: 'point' }) as CustomField<unknown>
    const { onChange, rerender } = renderField(field, null)
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-81.9' } })
    expect(onChange).toHaveBeenLastCalledWith([-81.9, 0])
    rerender([-81.9, 0])
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '26.4' } })
    expect(onChange).toHaveBeenLastCalledWith([-81.9, 26.4])
  })
})

describe('rich text field', () => {
  it('shows an excerpt and a disabled Edit text button without a sheet provider', () => {
    const field = toPuckField({ kind: 'richText', name: 'richText', label: 'Rich Text' }, 'pages.layout.content') as CustomField<unknown>
    const value = { root: { children: [{ children: [{ text: 'Hello' }, { text: 'there' }] }] } }
    renderField(field, value)
    expect(screen.getByText('Hello there')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Edit text' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('excerpts text nodes and trims long text', () => {
    expect(richTextExcerpt(null)).toBe('')
    expect(richTextExcerpt({ root: { children: [{ text: 'x'.repeat(100) }] } })).toHaveLength(81)
  })
})

describe('nested blocks field', () => {
  it('is a Puck slot limited to the blocks the field allows', () => {
    const field = toPuckField(
      {
        kind: 'blocks',
        name: 'blocks',
        label: 'Blocks',
        blocks: [
          { slug: 'container', label: 'Container', fields: [] },
          { slug: 'content', label: 'Text Columns', fields: [] },
        ],
        defaultValue: [],
      },
      'pages.layout.container',
    )
    expect(field).toEqual({ type: 'slot', allow: ['container', 'content'] })
  })
})
