'use client'

import { AutoField, type Field, FieldLabel } from '@puckeditor/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { defaultProps, newId } from './adapters'
import { BlockView } from './blocks'
import type { CanvasStyles } from './canvasStyles'
import { type PickedBlock, type PickerRequest, ROOT_ZONE, useBlockPicker } from './pickerContext'
import { toPuckFields } from './fields'
import { PreviewFrame } from './PreviewFrame'
import type { BlockSchema } from './schema'
import { usePuckSelector as usePuck } from './usePuck'

// Re-exported so existing imports keep working; the context lives in pickerContext.
export { BlockPickerProvider, ROOT_ZONE, useBlockPicker, type PickedBlock, type PickerRequest } from './pickerContext'

/**
 * Click-to-add blocks. A thin "+" strip between blocks on the canvas (and an
 * empty-state card when there are none) opens a dialog: pick a block from
 * the list, tweak its settings, watch it render live in a preview iframe
 * with the site's CSS, then confirm. Nothing touches the page until "Add to
 * page", so cancelling leaves no draft and no history entry.
 *
 * The strips live inside the canvas iframe, the dialog in the admin
 * document. Both sit under the same React tree, so a context carries the
 * request out of the iframe. The dialog is generic: it takes a list of block
 * schemas and an `onPick` callback, so the same dialog serves the root zone
 * and nested block slots.
 */

/**
 * Mount point for the dialog. Root-zone requests need Puck's `dispatch`, so
 * this renders inside <Puck>, in the admin document rather than the canvas
 * iframe.
 */
export function BlockPickerDialogSlot({ schemas }: { schemas: BlockSchema[] }) {
  const { state, close, canvasStyles } = useBlockPicker()
  const dispatch = usePuck((s) => s.dispatch)

  const insertAtRoot = useCallback(
    (index: number, { type, props }: PickedBlock) => {
      const id = newId()
      // Puck's insert has no props payload, so insert with a known id, then
      // replace that item with the configured one and select it.
      dispatch({ type: 'insert', componentType: type, destinationIndex: index, destinationZone: ROOT_ZONE, id })
      dispatch({
        type: 'replace',
        destinationIndex: index,
        destinationZone: ROOT_ZONE,
        data: { type, props: { ...props, id } },
      })
      dispatch({ type: 'setUi', ui: { itemSelector: { index, zone: ROOT_ZONE } } })
    },
    [dispatch],
  )

  if (!state) return null
  const request: PickerRequest =
    state.kind === 'root' ? { schemas, onPick: (block) => insertAtRoot(state.index, block) } : state.request
  return <BlockPickerDialog canvasStyles={canvasStyles} onClose={close} request={request} />
}

/* ---------- the dialog ---------- */

type Draft = { schema: BlockSchema; props: Record<string, unknown> } | null

const HIDDEN = new Set(['id', 'blockName'])
const settingCount = (schema: BlockSchema) => schema.fields.filter((f) => !HIDDEN.has(f.name)).length

export function BlockPickerDialog({
  request,
  canvasStyles,
  onClose,
}: {
  request: PickerRequest
  canvasStyles: CanvasStyles
  onClose: () => void
}) {
  const { schemas, onPick, title = 'Add a block' } = request
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft>(null)
  const [width, setWidth] = useState<number | '100%'>('100%')
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    search.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const confirm = useCallback(
    (schema: BlockSchema, props: Record<string, unknown>) => {
      onPick({ type: schema.slug, props })
      onClose()
    },
    [onPick, onClose],
  )

  const pick = (schema: BlockSchema) => setDraft({ schema, props: defaultProps(schema.fields) })

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const byGroup = new Map<string, BlockSchema[]>()
    for (const schema of schemas) {
      if (q && !schema.label.toLowerCase().includes(q) && !schema.slug.toLowerCase().includes(q)) continue
      const group = schema.group ?? 'Blocks'
      byGroup.set(group, [...(byGroup.get(group) ?? []), schema])
    }
    return [...byGroup.entries()]
  }, [schemas, query])

  // Payload adds `id` and `blockName` to every block; neither is a setting to configure here.
  const fields = useMemo(
    () => (draft ? Object.entries(toPuckFields(draft.schema.fields)).filter(([name]) => !HIDDEN.has(name)) : []),
    [draft],
  )

  return (
    <div aria-modal="true" onClick={onClose} role="dialog" style={backdrop}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...dialog, width: draft ? 'min(1280px, 96vw)' : 'min(720px, 92vw)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, flex: 1 }}>
            {draft ? `${title}: ${draft.schema.label}` : title}
          </h2>
          <button aria-label="Close" onClick={onClose} style={closeBtn} type="button">
            ×
          </button>
        </div>

        <div style={{ ...columns, gridTemplateColumns: draft ? '220px 320px minmax(0, 1fr)' : '1fr' }}>
          {/* Column 1: the block list */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <input
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search blocks…"
              ref={search}
              style={searchInput}
              type="search"
              value={query}
            />
            <div style={{ overflowY: 'auto', flex: 1, marginTop: 12 }}>
              {groups.length === 0 && <p style={{ fontSize: 13, opacity: 0.7 }}>No blocks match “{query}”.</p>}
              {groups.map(([group, blocks]) => (
                <section key={group} style={{ marginBottom: 16 }}>
                  <h3 style={groupTitle}>{group}</h3>
                  <div style={{ ...grid, gridTemplateColumns: draft ? '1fr' : 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                    {blocks.map((b) => {
                      const active = draft?.schema.slug === b.slug
                      return (
                        <button
                          aria-pressed={active}
                          key={b.slug}
                          onClick={() => pick(b)}
                          onDoubleClick={() => confirm(b, defaultProps(b.fields))}
                          style={{ ...tile, borderColor: active ? '#1f6a78' : '#ddd', background: active ? '#eef5f6' : '#fafafa' }}
                          title="Click to configure, double-click to add with defaults"
                          type="button"
                        >
                          <span style={{ fontWeight: 600 }}>{b.label}</span>
                          <span style={{ fontSize: 11, opacity: 0.6 }}>{settingCount(b)} settings</span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>

          {draft && (
            <>
              {/* Column 2: settings */}
              <div style={settings}>
                {fields.map(([name, field]) => {
                  const input = (
                    <AutoField
                      field={field as Field}
                      id={`picker-${draft.schema.slug}-${name}`}
                      onChange={(value: unknown) =>
                        setDraft((d) => (d ? { ...d, props: { ...d.props, [name]: value } } : d))
                      }
                      value={draft.props[name]}
                    />
                  )
                  // AutoField renders no label of its own; custom fields draw theirs.
                  return (
                    <div key={name} style={{ marginBottom: 12 }}>
                      {field.type === 'custom' || !field.label ? input : <FieldLabel label={field.label}>{input}</FieldLabel>}
                    </div>
                  )
                })}
                {fields.length === 0 && <p style={{ fontSize: 13, opacity: 0.7 }}>This block has no settings.</p>}
              </div>

              {/* Column 3: live preview */}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                  {(
                    [
                      ['Mobile', 375],
                      ['Desktop', '100%'],
                    ] as const
                  ).map(([label, w]) => (
                    <button
                      aria-pressed={width === w}
                      key={label}
                      onClick={() => setWidth(w)}
                      style={{ ...toolButton, background: width === w ? '#e6eef0' : '#fff' }}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div style={previewWell}>
                  <PreviewFrame styles={canvasStyles} width={width}>
                    <article className="bg-background py-8 text-foreground">
                      <BlockView label={draft.schema.label} props={{ ...draft.props, id: 'preview' }} slug={draft.schema.slug} />
                    </article>
                  </PreviewFrame>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={footer}>
          {draft ? (
            <span style={{ fontSize: 12, opacity: 0.7 }}>Nothing is saved until you add the block.</span>
          ) : (
            <span style={{ fontSize: 12, opacity: 0.7 }}>Pick a block to configure it, or double-click to add it as is.</span>
          )}
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={secondaryBtn} type="button">
            Cancel
          </button>
          <button
            disabled={!draft}
            onClick={() => draft && confirm(draft.schema, draft.props)}
            style={{ ...primaryBtn, opacity: draft ? 1 : 0.5 }}
            type="button"
          >
            Add to page
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- canvas affordances (render inside the iframe) ---------- */

/**
 * A "+" strip. Placed under each block by the component render and at the
 * top of the canvas by the root render. Stops the click so Puck does not
 * treat it as selecting the block it sits in.
 */
export function InsertStrip({ index }: { index: number }) {
  const { openAtRoot } = useBlockPicker()
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ position: 'relative', height: 0, zIndex: 10 }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: -1,
          height: 2,
          background: hover ? '#1f6a78' : 'transparent',
          transition: 'background 120ms',
        }}
      />
      <button
        aria-label="Add block here"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          openAtRoot(index)
        }}
        style={{
          ...plus,
          opacity: hover ? 1 : 0.35,
          transform: `translate(-50%, -50%) scale(${hover ? 1 : 0.85})`,
        }}
        title="Add block here"
        type="button"
      >
        +
      </button>
    </div>
  )
}

/** Shown by the root render when the page has no blocks. */
export function EmptyCanvas() {
  const { openAtRoot } = useBlockPicker()
  return (
    <div className="container" onPointerDown={(e) => e.stopPropagation()}>
      <button onClick={() => openAtRoot(0)} style={emptyCard} type="button">
        <span style={{ fontSize: 32, lineHeight: 1 }}>+</span>
        <span style={{ fontWeight: 600, fontSize: 16 }}>Add your first block</span>
        <span style={{ fontSize: 13, opacity: 0.7 }}>
          Pick from heroes, content, galleries, listings and more.
        </span>
      </button>
    </div>
  )
}

/** Index of the item with this id in the root zone, or -1. */
export function useRootIndex(id: string): number {
  return usePuck((s) => s.appState.data.content.findIndex((item) => item.props.id === id))
}

/* ---------- styles ---------- */

const backdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  colorScheme: 'light',
  color: '#2f2f2f',
}
const dialog: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: 20,
  height: 'min(760px, 90vh)',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  fontFamily: 'system-ui, sans-serif',
  transition: 'width 150ms',
}
const columns: React.CSSProperties = {
  display: 'grid',
  gap: 16,
  flex: 1,
  minHeight: 0,
}
const settings: React.CSSProperties = {
  overflowY: 'auto',
  minHeight: 0,
  paddingRight: 8,
  borderLeft: '1px solid #eee',
  borderRight: '1px solid #eee',
  padding: '0 12px',
}
const previewWell: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  background: '#e9e9e9',
  border: '1px solid #ddd',
  borderRadius: 6,
  overflow: 'auto',
  display: 'flex',
  justifyContent: 'center',
}
const footer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 12,
  paddingTop: 12,
  borderTop: '1px solid #eee',
}
const closeBtn: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  padding: '0 4px',
}
const searchInput: React.CSSProperties = {
  width: '100%',
  border: '1px solid #ccc',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
  background: '#fff',
}
const groupTitle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  opacity: 0.6,
}
const grid: React.CSSProperties = {
  display: 'grid',
  gap: 8,
}
const tile: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 4,
  textAlign: 'left',
  border: '1px solid #ddd',
  borderRadius: 6,
  background: '#fafafa',
  padding: '12px 14px',
  fontSize: 13,
  cursor: 'pointer',
  color: 'inherit',
}
const toolButton: React.CSSProperties = {
  border: '1px solid #ddd',
  background: '#fff',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 12,
  cursor: 'pointer',
  color: 'inherit',
}
const primaryBtn: React.CSSProperties = {
  background: '#1f6a78',
  color: '#fff',
  border: 0,
  borderRadius: 4,
  padding: '8px 16px',
  fontWeight: 600,
  cursor: 'pointer',
}
const secondaryBtn: React.CSSProperties = {
  background: '#fff',
  color: 'inherit',
  border: '1px solid #ccc',
  borderRadius: 4,
  padding: '8px 16px',
  cursor: 'pointer',
}
const plus: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: 0,
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: 0,
  background: '#1f6a78',
  color: '#fff',
  fontSize: 20,
  lineHeight: '28px',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  transition: 'opacity 120ms, transform 120ms',
  fontFamily: 'system-ui, sans-serif',
}
const emptyCard: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  padding: '64px 24px',
  border: '2px dashed #bbb',
  borderRadius: 12,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontFamily: 'inherit',
}
