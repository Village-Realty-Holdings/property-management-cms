'use client'

import { usePuckSelector as usePuck } from './usePuck'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import type { BlockSchema } from './schema'

/**
 * Click-to-add blocks. A thin "+" strip between blocks on the canvas (and an
 * empty-state card when there are none) opens a dialog listing every block
 * grouped by category; picking one inserts it at that position and selects
 * it so its settings open in the sidebar.
 *
 * The strips live inside the canvas iframe, the dialog in the admin document.
 * Both sit under the same React tree, so a context carries the request out
 * of the iframe. Inserting goes through Puck's own `insert` action, which
 * records history and fires `onChange` like a drag from the drawer would.
 */

/** Puck's id for the root drop zone. */
export const ROOT_ZONE = 'root:default-zone'

type PickerState = { index: number } | null

type PickerApi = { state: PickerState; open: (index: number) => void; close: () => void }

const PickerContext = createContext<PickerApi>({ state: null, open: () => {}, close: () => {} })

export const useBlockPicker = () => useContext(PickerContext)

/** Wrap the Puck editor; exposes `open(index)` to anything inside. */
export function BlockPickerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PickerState>(null)
  const api = useMemo<PickerApi>(
    () => ({ state, open: (index) => setState({ index }), close: () => setState(null) }),
    [state],
  )
  return <PickerContext.Provider value={api}>{children}</PickerContext.Provider>
}

/**
 * Mount point for the dialog. It needs Puck's `dispatch`, so `VisualEditor`
 * places it inside `<Puck>` through the `puck` override, in the admin
 * document rather than the canvas iframe.
 */
export function BlockPickerDialogSlot({ schemas }: { schemas: BlockSchema[] }) {
  const { state, close } = useBlockPicker()
  if (!state) return null
  return <BlockPickerDialog index={state.index} onClose={close} schemas={schemas} />
}

function BlockPickerDialog({
  index,
  schemas,
  onClose,
}: {
  index: number
  schemas: BlockSchema[]
  onClose: () => void
}) {
  const dispatch = usePuck((s) => s.dispatch)
  const [query, setQuery] = useState('')
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    search.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const insert = useCallback(
    (componentType: string) => {
      dispatch({
        type: 'insert',
        componentType,
        destinationIndex: index,
        destinationZone: ROOT_ZONE,
      })
      dispatch({ type: 'setUi', ui: { itemSelector: { index, zone: ROOT_ZONE } } })
      onClose()
    },
    [dispatch, index, onClose],
  )

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const byGroup = new Map<string, BlockSchema[]>()
    for (const schema of schemas) {
      if (q && !schema.label.toLowerCase().includes(q) && !schema.slug.toLowerCase().includes(q))
        continue
      const group = schema.group ?? 'Blocks'
      byGroup.set(group, [...(byGroup.get(group) ?? []), schema])
    }
    return [...byGroup.entries()]
  }, [schemas, query])

  return (
    <div aria-modal="true" onClick={onClose} role="dialog" style={backdrop}>
      <div onClick={(e) => e.stopPropagation()} style={dialog}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, flex: 1 }}>Add a block</h2>
          <button aria-label="Close" onClick={onClose} style={closeBtn} type="button">
            ×
          </button>
        </div>
        <input
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search blocks…"
          ref={search}
          style={searchInput}
          type="search"
          value={query}
        />
        <div style={{ overflowY: 'auto', flex: 1, marginTop: 12 }}>
          {groups.length === 0 && (
            <p style={{ fontSize: 13, opacity: 0.7 }}>No blocks match “{query}”.</p>
          )}
          {groups.map(([group, blocks]) => (
            <section key={group} style={{ marginBottom: 16 }}>
              <h3 style={groupTitle}>{group}</h3>
              <div style={grid}>
                {blocks.map((b) => (
                  <button key={b.slug} onClick={() => insert(b.slug)} style={tile} type="button">
                    <span style={{ fontWeight: 600 }}>{b.label}</span>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>{b.fields.length} settings</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
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
  const { open } = useBlockPicker()
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
          open(index)
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
  const { open } = useBlockPicker()
  return (
    <div className="container" onPointerDown={(e) => e.stopPropagation()}>
      <button onClick={() => open(0)} style={emptyCard} type="button">
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
  width: 'min(720px, 92vw)',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  fontFamily: 'system-ui, sans-serif',
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
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
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
