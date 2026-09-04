'use client'

import type { CustomField, Field } from '@puckeditor/core'
import { FieldLabel } from '@puckeditor/core'
import { useEffect, useState } from 'react'

import type { FieldSchema, Option } from './schema'
import { defaultProps } from './adapters'

/**
 * Sidebar editors for the visual editor, built from the block schema.
 *
 * Simple fields map onto Puck's own fields. Uploads get a media picker,
 * single relationships a document picker. Rich text and nested blocks keep
 * their data but are edited in the form view; the sidebar says so.
 */
export function toPuckFields(fields: FieldSchema[]): Record<string, Field> {
  const out: Record<string, Field> = {}
  for (const field of fields) out[field.name] = toPuckField(field)
  return out
}

/** Top-level block fields: the same, plus Payload's optional admin label. */
export function toBlockFields(fields: FieldSchema[]): Record<string, Field> {
  return { ...toPuckFields(fields), blockName: { type: 'text', label: 'Block name (admin label)' } }
}

export function toPuckField(field: FieldSchema): Field {
  switch (field.kind) {
    case 'scalar':
      if (field.hasMany) return listField(field.label)
      switch (field.type) {
        case 'textarea':
        case 'json':
          return { type: 'textarea', label: field.label }
        case 'number':
          return { type: 'number', label: field.label, min: field.min, max: field.max }
        case 'checkbox':
          return {
            type: 'radio',
            label: field.label,
            options: [
              { label: 'Yes', value: true },
              { label: 'No', value: false },
            ],
          }
        case 'point':
          return noteField(field.label, 'Edit in the form view.')
        default:
          return { type: 'text', label: field.label }
      }
    case 'choice':
      if (field.hasMany) return multiSelectField(field.label, field.options)
      return { type: field.type, label: field.label, options: field.options }
    case 'relation':
      if (field.hasMany || Array.isArray(field.relationTo)) return noteField(field.label, 'Edit in the form view.')
      if (field.type === 'upload') return mediaField(field.label, field.relationTo)
      return relationField(field.label, field.relationTo)
    case 'richText':
      return noteField(field.label, 'Rich text: edit in the form view.')
    case 'blocks':
      return noteField(field.label, 'Nested blocks: edit in the form view.')
    case 'group':
      return { type: 'object', label: field.label, objectFields: toPuckFields(field.fields) }
    case 'array':
      return {
        type: 'array',
        label: field.label,
        min: field.minRows,
        max: field.maxRows,
        arrayFields: toPuckFields(field.fields),
        defaultItemProps: defaultProps(field.fields),
        getItemSummary: (item, index) => summarize(item, field.label, index),
      }
  }
}

const summarize = (item: Record<string, unknown>, label: string, index = 0): string => {
  for (const [key, value] of Object.entries(item)) {
    if (key === 'id') continue
    if (typeof value === 'string' && value.trim()) return value.length > 40 ? `${value.slice(0, 40)}…` : value
  }
  return `${label} ${index + 1}`
}

/* ---------- custom fields ---------- */

type Doc = { id: number | string; title?: string; name?: string; slug?: string; alt?: string; url?: string; thumbnailURL?: string }

const noteField = (label: string, note: string): CustomField<unknown> => ({
  type: 'custom',
  label,
  render: ({ field }) => (
    <div>
      <FieldLabel label={field.label ?? label} />
      <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>{note}</p>
    </div>
  ),
})

/** Comma-separated editor for `hasMany` text fields such as amenity ids. */
const listField = (label: string): CustomField<string[] | null | undefined> => ({
  type: 'custom',
  label,
  render: ({ field, value, onChange, readOnly }) => (
    <div>
      <FieldLabel label={field.label ?? label} />
      <input
        defaultValue={(value ?? []).join(', ')}
        disabled={readOnly}
        onBlur={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        placeholder="one, two, three"
        style={input}
        type="text"
      />
    </div>
  ),
})

const multiSelectField = (label: string, options: Option[]): CustomField<string[] | null | undefined> => ({
  type: 'custom',
  label,
  render: ({ field, value, onChange, readOnly }) => {
    const selected = new Set(value ?? [])
    return (
      <div>
        <FieldLabel label={field.label ?? label} />
        {options.map((o) => (
          <label key={o.value} style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'center' }}>
            <input
              checked={selected.has(o.value)}
              disabled={readOnly}
              onChange={(e) => {
                const next = new Set(selected)
                if (e.target.checked) next.add(o.value)
                else next.delete(o.value)
                onChange(options.map((x) => x.value).filter((v) => next.has(v)))
              }}
              type="checkbox"
            />
            {o.label}
          </label>
        ))}
      </div>
    )
  },
})

function useDocs(collection: string, open: boolean) {
  const [docs, setDocs] = useState<Doc[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open || docs) return
    let cancelled = false
    fetch(`/api/${collection}?limit=100&depth=0&sort=-updatedAt`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${collection} returned ${res.status}`)
        const json = (await res.json()) as { docs: Doc[] }
        if (!cancelled) setDocs(json.docs)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [collection, open, docs])
  return { docs, error }
}

const titleOf = (doc: Doc) => doc.title ?? doc.name ?? doc.alt ?? doc.slug ?? `#${doc.id}`

type RelValue = Doc | number | string | null | undefined

/** Pick a single document from a collection; the value stays populated until save. */
const relationField = (label: string, collection: string): CustomField<RelValue> => ({
  type: 'custom',
  label,
  render: ({ field, value, onChange, readOnly }) => <RelationPicker collection={collection} field={field} label={label} onChange={onChange} readOnly={readOnly} value={value} />,
})

function RelationPicker({
  collection,
  field,
  label,
  value,
  onChange,
  readOnly,
}: {
  collection: string
  field: CustomField<RelValue>
  label: string
  value: RelValue
  onChange: (v: RelValue) => void
  readOnly?: boolean
}) {
  const { docs, error } = useDocs(collection, true)
  const current = value && typeof value === 'object' ? value.id : (value ?? '')
  return (
    <div>
      <FieldLabel label={field.label ?? label} />
      {error && <p style={{ color: '#b00', fontSize: 12 }}>{error}</p>}
      <select
        disabled={readOnly || !docs}
        onChange={(e) => {
          const doc = docs?.find((d) => String(d.id) === e.target.value)
          onChange(doc ?? null)
        }}
        style={input}
        value={String(current)}
      >
        <option value="">{docs ? 'None' : 'Loading…'}</option>
        {(docs ?? []).map((d) => (
          <option key={d.id} value={String(d.id)}>
            {titleOf(d)}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Pick from the media library. Uploads still happen in the Media collection so alt text stays required. */
const mediaField = (label: string, collection: string): CustomField<RelValue> => ({
  type: 'custom',
  label,
  render: ({ field, value, onChange, readOnly }) => <MediaPicker collection={collection} field={field} label={label} onChange={onChange} readOnly={readOnly} value={value} />,
})

function MediaPicker({
  collection,
  field,
  label,
  value,
  onChange,
  readOnly,
}: {
  collection: string
  field: CustomField<RelValue>
  label: string
  value: RelValue
  onChange: (v: RelValue) => void
  readOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const { docs, error } = useDocs(collection, open)
  const current = value && typeof value === 'object' ? value : null
  const src = current?.thumbnailURL || current?.url || null
  const uploadHref = `/admin/collections/${collection}/create`

  return (
    <div>
      <FieldLabel label={field.label ?? label} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={thumb}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={current?.alt ?? ''} src={src} style={cover} />
          ) : value ? (
            `#${String(value)}`
          ) : (
            'None'
          )}
        </div>
        {!readOnly && (
          <>
            <button onClick={() => setOpen((o) => !o)} style={btn} type="button">
              {open ? 'Close' : value ? 'Change' : 'Choose'}
            </button>
            {value && (
              <button onClick={() => onChange(null)} style={btn} type="button">
                Clear
              </button>
            )}
          </>
        )}
      </div>
      {open && (
        <div style={{ marginTop: 8 }}>
          {error && <p style={{ color: '#b00', fontSize: 12 }}>{error}</p>}
          {!docs && !error && <p style={{ fontSize: 12 }}>Loading…</p>}
          {docs && docs.length === 0 && (
            <p style={{ fontSize: 12 }}>
              No images yet.{' '}
              <a href={uploadHref} rel="noreferrer" target="_blank">
                Upload one
              </a>
              .
            </p>
          )}
          {docs && docs.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {docs.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onChange(m)
                    setOpen(false)
                  }}
                  style={{ ...btn, padding: 0, aspectRatio: '4 / 3', overflow: 'hidden', outline: current?.id === m.id ? '2px solid #1f6a78' : undefined }}
                  title={m.alt}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={m.alt ?? ''} src={m.thumbnailURL || m.url || ''} style={cover} />
                </button>
              ))}
            </div>
          )}
          <p style={{ fontSize: 12, marginTop: 6 }}>
            <a href={uploadHref} rel="noreferrer" target="_blank">
              Upload a new image
            </a>{' '}
            then reopen this list.
          </p>
        </div>
      )}
    </div>
  )
}

const input: React.CSSProperties = { width: '100%', border: '1px solid #ccc', borderRadius: 4, padding: '6px 8px', fontSize: 13, background: '#fff' }
const btn: React.CSSProperties = { border: '1px solid #ccc', borderRadius: 4, background: '#fff', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }
const thumb: React.CSSProperties = {
  width: 96,
  height: 64,
  borderRadius: 4,
  background: '#eee',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  color: '#666',
}
const cover: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' }
