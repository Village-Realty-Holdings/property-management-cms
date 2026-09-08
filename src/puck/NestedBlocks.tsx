'use client'

import { AutoField, type Field, FieldLabel } from '@puckeditor/core'
import { useMemo, useState } from 'react'

import { defaultProps, newId } from './adapters'
import { useBlockPicker } from './pickerContext'
import { summarize, toPuckFields } from './fields'
import type { BlockSchema, FieldSchema } from './schema'
import { slotVisible } from './sectionSlots'
import { usePuckSelector as usePuck } from './usePuck'

/**
 * Sidebar editor for a `blocks` field (the Section block's slots). Rows keep
 * Payload's shape, `{ id, blockType, ...props }`, so saving needs no
 * adapter change. "+" opens the same add-block dialog the canvas uses,
 * scoped to the blocks the slot allows; editing a row swaps the list for the
 * row's fields with a Back link.
 */

type Row = { id: string; blockType: string } & Record<string, unknown>
type BlocksField = Extract<FieldSchema, { kind: 'blocks' }> & { minRows?: number; maxRows?: number }

const HIDDEN = new Set(['id', 'blockName'])

export function NestedBlocks({
  field,
  label,
  schemaPath,
  value,
  onChange,
  readOnly,
}: {
  field: BlocksField
  label: string
  schemaPath: string
  value: unknown
  onChange: (rows: Row[]) => void
  readOnly?: boolean
}) {
  const rows = useMemo(() => (Array.isArray(value) ? (value as Row[]) : []), [value])
  const [editing, setEditing] = useState<string | null>(null)
  const { open } = useBlockPicker()

  // Section slots depend on the sibling `layout`; the selected canvas block
  // carries it. (In the add dialog nothing is selected, so every slot shows.)
  const layout = usePuck((s) => {
    const item = s.selectedItem as { type?: string; props?: { layout?: unknown } } | null
    return item?.type === 'section' ? item.props?.layout : undefined
  })
  if (layout !== undefined && !slotVisible(field.name, layout)) {
    return (
      <div>
        <FieldLabel label={label} />
        <p style={note}>Not shown by the current layout.</p>
      </div>
    )
  }

  const update = (next: Row[]) => onChange(next)
  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return
    const next = [...rows]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    update(next)
  }
  const add = () =>
    open({
      schemas: field.blocks,
      title: `Add to ${label}`,
      onPick: ({ type, props }) => update([...rows, { ...props, id: newId(), blockType: type } as Row]),
    })

  const current = editing ? rows.find((r) => r.id === editing) : undefined
  const currentSchema = current ? field.blocks.find((b) => b.slug === current.blockType) : undefined

  if (current && currentSchema) {
    return (
      <RowEditor
        onBack={() => setEditing(null)}
        onChange={(patch) => update(rows.map((r) => (r.id === current.id ? { ...r, ...patch } : r)))}
        parentLabel={label}
        readOnly={readOnly}
        row={current}
        schema={currentSchema}
        schemaPath={`${schemaPath}.${field.name}.${currentSchema.slug}`}
      />
    )
  }

  const atMax = typeof field.maxRows === 'number' && rows.length >= field.maxRows
  return (
    <div>
      <FieldLabel label={label} />
      {rows.length === 0 && <p style={note}>Nothing here yet.</p>}
      <ul style={list}>
        {rows.map((row, i) => {
          const schema = field.blocks.find((b) => b.slug === row.blockType)
          return (
            <li key={row.id} style={item}>
              <button
                disabled={readOnly || !schema}
                onClick={() => setEditing(row.id)}
                style={rowBtn}
                title="Edit"
                type="button"
              >
                <span style={{ fontWeight: 600 }}>{schema?.label ?? row.blockType}</span>
                <span style={{ opacity: 0.6, marginLeft: 6 }}>{summarize(row, schema?.label ?? row.blockType, i)}</span>
              </button>
              {!readOnly && (
                <span style={{ display: 'flex', gap: 2 }}>
                  <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} style={iconBtn} type="button">
                    ↑
                  </button>
                  <button aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, i + 1)} style={iconBtn} type="button">
                    ↓
                  </button>
                  <button aria-label="Remove" onClick={() => update(rows.filter((r) => r.id !== row.id))} style={iconBtn} type="button">
                    ×
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {!readOnly && !atMax && (
        <button onClick={add} style={addBtn} type="button">
          + Add block
        </button>
      )}
      {atMax && <p style={note}>Up to {field.maxRows} here.</p>}
    </div>
  )
}

/** One nested block's fields, rendered with AutoField and written back into the row. */
function RowEditor({
  row,
  schema,
  schemaPath,
  parentLabel,
  onBack,
  onChange,
  readOnly,
}: {
  row: Row
  schema: BlockSchema
  schemaPath: string
  parentLabel: string
  onBack: () => void
  onChange: (patch: Record<string, unknown>) => void
  readOnly?: boolean
}) {
  const fields = useMemo(
    () => Object.entries(toPuckFields(schema.fields, schemaPath)).filter(([name]) => !HIDDEN.has(name)),
    [schema, schemaPath],
  )
  // A row created before defaults existed still gets the block's defaults under it.
  const props = useMemo(() => ({ ...defaultProps(schema.fields), ...row }), [schema, row])
  return (
    <div>
      <button onClick={onBack} style={backBtn} type="button">
        ‹ Back to {parentLabel}
      </button>
      <p style={{ margin: '4px 0 12px', fontSize: 13, fontWeight: 600 }}>{schema.label}</p>
      {fields.map(([name, field]) => {
        const input = (
          <AutoField
            field={field as Field}
            id={`nested-${row.id}-${name}`}
            onChange={(v: unknown) => onChange({ [name]: v })}
            readOnly={readOnly}
            value={props[name]}
          />
        )
        return (
          <div key={name} style={{ marginBottom: 12 }}>
            {field.type === 'custom' || !field.label ? input : <FieldLabel label={field.label}>{input}</FieldLabel>}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- styles ---------- */

const note: React.CSSProperties = { fontSize: 12, opacity: 0.7, margin: '4px 0' }
const list: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }
const item: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  border: '1px solid #ddd',
  borderRadius: 6,
  background: '#fafafa',
  padding: '4px 6px',
  fontSize: 13,
}
const rowBtn: React.CSSProperties = {
  flex: 1,
  textAlign: 'left',
  border: 0,
  background: 'transparent',
  padding: '6px 4px',
  cursor: 'pointer',
  color: 'inherit',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
}
const iconBtn: React.CSSProperties = {
  border: '1px solid #ddd',
  background: '#fff',
  borderRadius: 4,
  width: 24,
  height: 24,
  cursor: 'pointer',
  color: 'inherit',
  fontSize: 13,
  lineHeight: 1,
}
const addBtn: React.CSSProperties = {
  marginTop: 8,
  border: '1px dashed #bbb',
  background: 'transparent',
  borderRadius: 6,
  padding: '8px 10px',
  width: '100%',
  cursor: 'pointer',
  color: 'inherit',
  fontSize: 13,
}
const backBtn: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  color: '#1f6a78',
  fontSize: 13,
}
