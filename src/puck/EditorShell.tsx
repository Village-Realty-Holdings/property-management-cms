'use client'

import { Puck } from '@puckeditor/core'

import { BlockPickerDialogSlot } from './BlockPicker'
import { OutlineMenu } from './OutlineMenu'
import type { BlockSchema } from './schema'
import { usePuckSelector as usePuck } from './usePuck'

/**
 * The editor's own layout, rendered as children of <Puck> so Puck skips its
 * stock chrome (header, Blocks and Outline sidebars). What remains is the
 * canvas and the fields sidebar, plus a header carrying navigation, viewport
 * and save controls. Everything here sits inside Puck's store, so hooks and
 * the block picker dialog keep working.
 */

/** `dirty` means edits are waiting for the user to save them. */
export type Status = { kind: 'idle' | 'dirty' | 'saving' | 'saved' | 'error'; message?: string }

type Props = {
  title: string
  status: Status
  onSave: () => void
  onPublish: () => void
  formHref: string
  previewHref: string | null
  schemas: BlockSchema[]
}

export function EditorShell({ title, status, onSave, onPublish, formHref, previewHref, schemas }: Props) {
  return (
    <div style={shell}>
      <EditorHeader
        formHref={formHref}
        onPublish={onPublish}
        onSave={onSave}
        previewHref={previewHref}
        status={status}
        title={title}
      />
      <CanvasArea />
      <FieldsPanel />
      <BlockPickerDialogSlot schemas={schemas} />
    </div>
  )
}

/* ---------- header ---------- */

function EditorHeader({ title, status, onSave, onPublish, formHref, previewHref }: Omit<Props, 'schemas'>) {
  return (
    <header style={header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <strong style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </strong>
        <OutlineMenu />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ViewportSwitch />
        <HistoryButtons />
      </div>
      <SaveActions formHref={formHref} onPublish={onPublish} onSave={onSave} previewHref={previewHref} status={status} />
    </header>
  )
}

function ViewportSwitch() {
  const viewports = usePuck((s) => s.appState.ui.viewports)
  const dispatch = usePuck((s) => s.dispatch)
  return (
    <div aria-label="Canvas width" role="group" style={{ display: 'flex', gap: 2 }}>
      {viewports.options.map((v) => {
        const active = v.width === viewports.current.width
        return (
          <button
            aria-pressed={active}
            key={String(v.width)}
            onClick={() =>
              dispatch({
                type: 'setUi',
                ui: { viewports: { ...viewports, current: { width: v.width, height: v.height ?? 'auto' } } },
              })
            }
            style={{ ...toolButton, background: active ? '#e6eef0' : '#fff' }}
            title={`${v.label ?? v.width}`}
            type="button"
          >
            {v.label ?? String(v.width)}
          </button>
        )
      })}
    </div>
  )
}

function HistoryButtons() {
  const history = usePuck((s) => s.history)
  return (
    <div role="group" style={{ display: 'flex', gap: 2 }}>
      <button disabled={!history.hasPast} onClick={history.back} style={toolButton} title="Undo" type="button">
        ↶
      </button>
      <button disabled={!history.hasFuture} onClick={history.forward} style={toolButton} title="Redo" type="button">
        ↷
      </button>
    </div>
  )
}

function SaveActions({
  status,
  onSave,
  onPublish,
  formHref,
  previewHref,
}: {
  status: Status
  onSave: () => void
  onPublish: () => void
  formHref: string
  previewHref: string | null
}) {
  const label =
    status.kind === 'saving'
      ? `${status.message ?? 'Saving'}…`
      : status.kind === 'saved'
        ? (status.message ?? 'Draft saved')
        : status.kind === 'error'
          ? status.message
          : status.kind === 'dirty'
            ? 'Unsaved edits'
            : 'No changes'
  const busy = status.kind === 'saving'
  const dirty = status.kind === 'dirty' || status.kind === 'error'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, justifyContent: 'flex-end' }}>
      <span style={{ color: status.kind === 'error' ? '#b00020' : 'inherit', maxWidth: 360 }}>{label}</span>
      <a href={formHref} style={linkStyle}>
        Form view
      </a>
      {previewHref && (
        <a href={previewHref} rel="noreferrer" style={linkStyle} target="_blank">
          Preview draft
        </a>
      )}
      <button disabled={busy || !dirty} onClick={onSave} style={{ ...saveStyle, opacity: dirty ? 1 : 0.5 }} type="button">
        Save draft
      </button>
      <button disabled={busy} onClick={onPublish} style={publishStyle} type="button">
        Publish
      </button>
    </div>
  )
}

/* ---------- canvas ---------- */

/**
 * Scrollable area holding Puck's preview. The width comes from the viewport
 * setting; the desktop option is "100%" so the canvas fills the column
 * without CSS scaling, which would desync Puck's drag overlay.
 */
function CanvasArea() {
  const width = usePuck((s) => s.appState.ui.viewports.current.width)
  const dispatch = usePuck((s) => s.dispatch)
  return (
    <div
      onClick={(e) => {
        // A click on the grey surround, not the preview, clears the selection.
        if (e.target === e.currentTarget) dispatch({ type: 'setUi', ui: { itemSelector: null } })
      }}
      style={canvas}
    >
      <div style={{ width, maxWidth: '100%', height: '100%', margin: '0 auto', background: '#fff' }}>
        <Puck.Preview />
      </div>
    </div>
  )
}

/* ---------- fields ---------- */

function FieldsPanel() {
  const heading = usePuck((s) => {
    const item = s.selectedItem
    if (!item) return 'Page settings'
    return s.config.components[item.type]?.label ?? item.type
  })
  return (
    <aside style={fields}>
      <div style={fieldsHeading}>{heading}</div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Puck.Fields />
      </div>
    </aside>
  )
}

/* ---------- styles ---------- */

const shell: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 340px',
  gridTemplateRows: 'auto minmax(0, 1fr)',
  height: '100%',
  background: '#fff',
  fontFamily: 'system-ui, sans-serif',
}
const header: React.CSSProperties = {
  gridColumn: '1 / -1',
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  gap: 16,
  padding: '8px 16px',
  borderBottom: '1px solid #e2e2e2',
}
const canvas: React.CSSProperties = {
  overflow: 'auto',
  background: '#e9e9e9',
  padding: 0,
  height: '100%',
}
const fields: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  borderLeft: '1px solid #e2e2e2',
  minHeight: 0,
}
const fieldsHeading: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 600,
  borderBottom: '1px solid #eee',
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
const linkStyle: React.CSSProperties = { textDecoration: 'underline', color: 'inherit' }
const saveStyle: React.CSSProperties = {
  background: '#fff',
  color: 'inherit',
  border: '1px solid #bbb',
  borderRadius: 4,
  padding: '6px 14px',
  fontWeight: 600,
  cursor: 'pointer',
}
const publishStyle: React.CSSProperties = {
  background: '#1f6a78',
  color: '#fff',
  border: 0,
  borderRadius: 4,
  padding: '6px 14px',
  fontWeight: 600,
  cursor: 'pointer',
}
