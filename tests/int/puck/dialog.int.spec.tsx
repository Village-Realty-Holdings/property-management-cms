import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The add-block dialog: pick, configure, preview, confirm. Puck's AutoField
 * needs the Puck store and the preview needs a real iframe, so both are
 * stubbed; what is under test is the dialog's own flow and the payload it
 * hands back on "Add to page".
 */

vi.mock('@puckeditor/core', () => ({
  AutoField: ({ field, value, onChange, id }: { field: { label?: string }; value: unknown; onChange: (v: unknown) => void; id: string }) => (
    <label>
      {field.label}
      <input id={id} onChange={(e) => onChange(e.target.value)} value={String(value ?? '')} />
    </label>
  ),
  FieldLabel: ({ label, children }: { label: string; children?: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      {children}
    </div>
  ),
  createUsePuck: () => () => undefined,
}))
vi.mock('@/puck/PreviewFrame', () => ({
  PreviewFrame: ({ children }: { children: React.ReactNode }) => <div data-testid="preview">{children}</div>,
}))
vi.mock('@/puck/blocks', () => ({
  BlockView: ({ slug, props }: { slug: string; props: Record<string, unknown> }) => (
    <div data-testid="block">{`${slug}:${String(props.heading ?? '')}`}</div>
  ),
}))

import { BlockPickerDialog } from '@/puck/BlockPicker'
import type { BlockSchema } from '@/puck/schema'

const schemas: BlockSchema[] = [
  {
    slug: 'cta',
    label: 'Call to Action',
    group: 'Capture',
    fields: [
      { kind: 'scalar', name: 'heading', label: 'Heading', type: 'text', defaultValue: 'Book now' },
      // Payload injects these into every block; the dialog must not offer them.
      { kind: 'scalar', name: 'id', label: 'ID', type: 'text' },
      { kind: 'scalar', name: 'blockName', label: 'Block Name', type: 'text' },
    ],
  },
  { slug: 'gallery', label: 'Gallery', group: 'Property', fields: [] },
]

const styles = { links: [], inline: [], htmlClass: '' }

afterEach(cleanup)

function renderDialog() {
  const onPick = vi.fn()
  const onClose = vi.fn()
  render(<BlockPickerDialog canvasStyles={styles} onClose={onClose} request={{ schemas, onPick }} />)
  return { onPick, onClose }
}

describe('add-block dialog', () => {
  it('lists blocks by group and filters by search', () => {
    renderDialog()
    expect(screen.getByText('Capture')).toBeTruthy()
    expect(screen.getByText('Property')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('Search blocks…'), { target: { value: 'gal' } })
    expect(screen.queryByText('Call to Action')).toBeNull()
    expect(screen.getByText('Gallery')).toBeTruthy()
  })

  it('confirms nothing until a block is picked and configured', () => {
    const { onPick } = renderDialog()
    const add = screen.getByRole('button', { name: 'Add to page' }) as HTMLButtonElement
    expect(add.disabled).toBe(true)

    fireEvent.click(screen.getByText('Call to Action'))
    // Settings are seeded from the block defaults and the preview follows edits.
    const heading = screen.getByLabelText('Heading') as HTMLInputElement
    expect(heading.value).toBe('Book now')
    expect(screen.queryByLabelText('ID')).toBeNull()
    expect(screen.queryByLabelText('Block Name')).toBeNull()
    expect(screen.getByTestId('block').textContent).toBe('cta:Book now')

    fireEvent.change(heading, { target: { value: 'Stay longer' } })
    expect(screen.getByTestId('block').textContent).toBe('cta:Stay longer')
    expect(onPick).not.toHaveBeenCalled()

    fireEvent.click(add)
    expect(onPick).toHaveBeenCalledWith({ type: 'cta', props: { heading: 'Stay longer' } })
  })

  it('adds with defaults on double-click', () => {
    const { onPick, onClose } = renderDialog()
    fireEvent.doubleClick(screen.getByText('Gallery'))
    expect(onPick).toHaveBeenCalledWith({ type: 'gallery', props: {} })
    expect(onClose).toHaveBeenCalled()
  })

  it('cancels without picking', () => {
    const { onPick, onClose } = renderDialog()
    fireEvent.click(screen.getByText('Call to Action'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onPick).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
