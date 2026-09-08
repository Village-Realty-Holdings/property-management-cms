'use client'

import { useEffect, useRef, useState } from 'react'

import { ROOT_ZONE } from './pickerContext'
import { usePuckSelector as usePuck } from './usePuck'

/**
 * A header dropdown listing the page's blocks in order. Clicking one selects
 * it; Puck scrolls the canvas to the selection. This replaces the Outline
 * sidebar as a navigation aid without taking a permanent column.
 */
export function OutlineMenu() {
  const content = usePuck((s) => s.appState.data.content)
  const components = usePuck((s) => s.config.components)
  const selected = usePuck((s) => s.appState.ui.itemSelector)
  const dispatch = usePuck((s) => s.dispatch)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const select = (index: number) => {
    dispatch({ type: 'setUi', ui: { itemSelector: { index, zone: ROOT_ZONE } } })
    setOpen(false)
  }

  return (
    <div ref={root} style={{ position: 'relative' }}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        style={trigger}
        type="button"
      >
        Outline
        <span aria-hidden style={{ opacity: 0.6, marginLeft: 6 }}>
          {content.length}
        </span>
      </button>
      {open && (
        <ul role="listbox" style={menu}>
          {content.length === 0 && <li style={{ ...row, opacity: 0.6, cursor: 'default' }}>No blocks yet</li>}
          {content.map((item, index) => {
            const label = components[item.type]?.label ?? item.type
            const summary = summarize(item.props as Record<string, unknown>)
            const active = !selected?.zone || selected.zone === ROOT_ZONE ? selected?.index === index : false
            return (
              <li
                aria-selected={active}
                key={item.props.id}
                onClick={() => select(index)}
                role="option"
                style={{ ...row, background: active ? '#eef5f6' : 'transparent' }}
              >
                <span style={{ fontWeight: 600 }}>{label}</span>
                {summary && <span style={{ opacity: 0.6, marginLeft: 8 }}>{summary}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** The admin label if set, else the first string prop, trimmed to one line. */
function summarize(props: Record<string, unknown>): string {
  const name = props.blockName
  if (typeof name === 'string' && name.trim()) return clip(name)
  for (const [key, value] of Object.entries(props)) {
    if (key === 'id') continue
    if (typeof value === 'string' && value.trim()) return clip(value)
  }
  return ''
}

const clip = (s: string) => (s.length > 40 ? `${s.slice(0, 40)}…` : s)

const trigger: React.CSSProperties = {
  border: '1px solid #ddd',
  background: '#fff',
  borderRadius: 4,
  padding: '5px 10px',
  fontSize: 13,
  cursor: 'pointer',
  color: 'inherit',
}
const menu: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  minWidth: 260,
  maxHeight: '60vh',
  overflowY: 'auto',
  margin: 0,
  padding: 4,
  listStyle: 'none',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 6,
  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  zIndex: 50,
  fontSize: 13,
}
const row: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
