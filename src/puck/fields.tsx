'use client'

import type { CustomField, Field } from '@puckeditor/core'
import { FieldLabel } from '@puckeditor/core'
import { useEffect, useState } from 'react'

import type { FieldSchema, Option } from './schema'
import { defaultProps } from './adapters'

/**
 * Sidebar editors for the visual editor, built from the block schema.
 *
 * Simple fields map onto Puck's own fields. Text and textarea fields are also
 * editable inline on the canvas. Uploads get a media picker and relationships
 * a document picker, both handling `hasMany` and polymorphic `relationTo`.
 * Rich text and nested blocks keep their data but are edited in the form
 * view; the sidebar says so.
 */

/**
 * Text fields that are not prose: links, ids, codes and address parts. Puck
 * hands an inline-editable field to the block as a React node instead of a
 * string, so anything a block uses as an attribute or runs string methods on
 * stays sidebar-only.
 */
const NOT_INLINE =
  /^(url|href|link|linkUrl|email|code|slug|anchor|nodeId|currency|street|city|region|postalCode|country)$|(url|href|id|code)$/i

export const isInlineText = (name: string): boolean => !NOT_INLINE.test(name)
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
          return { type: 'textarea', label: field.label, contentEditable: isInlineText(field.name) }
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
        case 'text':
          return { type: 'text', label: field.label, contentEditable: isInlineText(field.name) }
        default:
          return { type: 'text', label: field.label }
      }
    case 'choice':
      if (field.hasMany) return multiSelectField(field.label, field.options)
      return { type: field.type, label: field.label, options: field.options }
    case 'relation':
      if (field.type === 'upload' && typeof field.relationTo === 'string')
        return mediaField(field.label, field.relationTo, Boolean(field.hasMany))
      return relationField(field.label, field.relationTo, Boolean(field.hasMany))
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
    if (typeof value === 'string' && value.trim())
      return value.length > 40 ? `${value.slice(0, 40)}…` : value
  }
  return `${label} ${index + 1}`
}

/* ---------- custom fields ---------- */

type Doc = {
  id: number | string
  title?: string
  name?: string
  slug?: string
  alt?: string
  url?: string
  thumbnailURL?: string
}

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

const multiSelectField = (
  label: string,
  options: Option[],
): CustomField<string[] | null | undefined> => ({
  type: 'custom',
  label,
  render: ({ field, value, onChange, readOnly }) => {
    const selected = new Set(value ?? [])
    return (
      <div>
        <FieldLabel label={field.label ?? label} />
        {options.map((o) => (
          <label
            key={o.value}
            style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'center' }}
          >
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

/** Loads the newest 100 docs of each collection once; a picker lists what it gets. */
function useDocs(collections: string[], open: boolean) {
  const [docs, setDocs] = useState<Record<string, Doc[]> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const key = collections.join(',')
  useEffect(() => {
    if (!open || docs) return
    let cancelled = false
    Promise.all(
      key.split(',').map(async (collection) => {
        const res = await fetch(`/api/${collection}?limit=100&depth=0&sort=-updatedAt`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error(`${collection} returned ${res.status}`)
        const json = (await res.json()) as { docs: Doc[] }
        return [collection, json.docs] as const
      }),
    )
      .then((pairs) => !cancelled && setDocs(Object.fromEntries(pairs)))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [key, open, docs])
  return { docs, error }
}

const titleOf = (doc: Doc) => doc.title ?? doc.name ?? doc.alt ?? doc.slug ?? `#${doc.id}`

/**
 * What a relation holds inside the editor. Single: a populated doc, an id, or
 * for polymorphic fields `{ relationTo, value }`. Many: an array of those.
 * `puckToLayout` reduces docs to ids on save.
 */
type Poly = { relationTo: string; value: Doc | number | string }
type RelItem = Doc | number | string | Poly
type RelValue = RelItem | RelItem[] | null | undefined

type Ref = { collection: string; id: string }

/** Where an item points, given the field's collection when it is not polymorphic. */
function refOf(item: RelItem | null | undefined, fallback: string): Ref | null {
  if (item === null || item === undefined || item === '') return null
  if (typeof item === 'object' && 'relationTo' in item) {
    const inner = refOf(item.value, item.relationTo)
    return inner && { collection: item.relationTo, id: inner.id }
  }
  if (typeof item === 'object') return { collection: fallback, id: String(item.id) }
  return { collection: fallback, id: String(item) }
}

const docOf = (item: RelItem | null | undefined): Doc | null => {
  if (!item || typeof item !== 'object') return null
  if ('relationTo' in item) return docOf(item.value)
  return item
}

const refKey = (ref: Ref) => `${ref.collection}:${ref.id}`

/** Pick documents from one or several collections, one or many. */
const relationField = (
  label: string,
  relationTo: string | string[],
  hasMany: boolean,
): CustomField<RelValue> => ({
  type: 'custom',
  label,
  render: ({ field, value, onChange, readOnly }) => (
    <RelationPicker
      field={field}
      hasMany={hasMany}
      label={label}
      onChange={onChange}
      readOnly={readOnly}
      relationTo={relationTo}
      value={value}
    />
  ),
})

function RelationPicker({
  relationTo,
  hasMany,
  field,
  label,
  value,
  onChange,
  readOnly,
}: {
  relationTo: string | string[]
  hasMany: boolean
  field: CustomField<RelValue>
  label: string
  value: RelValue
  onChange: (v: RelValue) => void
  readOnly?: boolean
}) {
  const poly = Array.isArray(relationTo)
  const collections = poly ? relationTo : [relationTo]
  const { docs, error } = useDocs(collections, true)
  const items: RelItem[] = hasMany
    ? Array.isArray(value)
      ? value
      : []
    : value && !Array.isArray(value)
      ? [value]
      : []
  const selected = items.map((i) => refOf(i, collections[0])).filter((r): r is Ref => r !== null)
  const selectedKeys = new Set(selected.map(refKey))

  /** The stored shape for a chosen doc: the doc itself, wrapped when polymorphic. */
  const wrap = (collection: string, doc: Doc): RelItem =>
    poly ? { relationTo: collection, value: doc } : doc

  const pick = (key: string) => {
    if (!key) return onChange(hasMany ? [] : null)
    const [collection, id] = key.split(':')
    const doc = docs?.[collection]?.find((d) => String(d.id) === id)
    if (!doc) return
    onChange(wrap(collection, doc))
  }

  const toggle = (collection: string, doc: Doc, on: boolean) => {
    const key = refKey({ collection, id: String(doc.id) })
    const kept = items.filter((i) => {
      const ref = refOf(i, collections[0])
      return ref && refKey(ref) !== key
    })
    onChange(on ? [...kept, wrap(collection, doc)] : kept)
  }

  const group = (collection: string, render: (d: Doc) => React.ReactNode) => {
    const list = docs?.[collection] ?? []
    return poly ? (
      <optgroup key={collection} label={humanizeSlug(collection)}>
        {list.map(render)}
      </optgroup>
    ) : (
      list.map(render)
    )
  }

  return (
    <div>
      <FieldLabel label={field.label ?? label} />
      {error && <p style={{ color: '#b00', fontSize: 12 }}>{error}</p>}
      {!hasMany && (
        <select
          disabled={readOnly || !docs}
          onChange={(e) => pick(e.target.value)}
          style={input}
          value={selected[0] ? refKey(selected[0]) : ''}
        >
          <option value="">{docs ? 'None' : 'Loading…'}</option>
          {collections.map((c) =>
            group(c, (d) => (
              <option key={`${c}:${d.id}`} value={`${c}:${d.id}`}>
                {titleOf(d)}
              </option>
            )),
          )}
        </select>
      )}
      {hasMany && (
        <div style={{ ...input, maxHeight: 220, overflowY: 'auto' }}>
          {!docs && !error && <p style={{ fontSize: 12, margin: 0 }}>Loading…</p>}
          {docs &&
            collections.map((c) => (
              <div key={c}>
                {poly && (
                  <p
                    style={{
                      fontSize: 11,
                      margin: '6px 0 2px',
                      opacity: 0.6,
                      textTransform: 'uppercase',
                    }}
                  >
                    {humanizeSlug(c)}
                  </p>
                )}
                {(docs[c] ?? []).map((d) => {
                  const key = refKey({ collection: c, id: String(d.id) })
                  return (
                    <label
                      key={key}
                      style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'center' }}
                    >
                      <input
                        checked={selectedKeys.has(key)}
                        disabled={readOnly}
                        onChange={(e) => toggle(c, d, e.target.checked)}
                        type="checkbox"
                      />
                      {titleOf(d)}
                    </label>
                  )
                })}
                {docs[c]?.length === 0 && (
                  <p style={{ fontSize: 12, margin: 0, opacity: 0.7 }}>
                    Nothing in {humanizeSlug(c)} yet.
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

const humanizeSlug = (slug: string) =>
  slug.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase())

/** Pick from the media library. Uploads still happen in the Media collection so alt text stays required. */
const mediaField = (
  label: string,
  collection: string,
  hasMany: boolean,
): CustomField<RelValue> => ({
  type: 'custom',
  label,
  render: ({ field, value, onChange, readOnly }) => (
    <MediaPicker
      collection={collection}
      field={field}
      hasMany={hasMany}
      label={label}
      onChange={onChange}
      readOnly={readOnly}
      value={value}
    />
  ),
})

function MediaPicker({
  collection,
  hasMany,
  field,
  label,
  value,
  onChange,
  readOnly,
}: {
  collection: string
  hasMany: boolean
  field: CustomField<RelValue>
  label: string
  value: RelValue
  onChange: (v: RelValue) => void
  readOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const { docs: byCollection, error } = useDocs([collection], open)
  const docs = byCollection?.[collection]
  const items: RelItem[] = hasMany
    ? Array.isArray(value)
      ? value
      : []
    : value && !Array.isArray(value)
      ? [value]
      : []
  const selectedIds = new Set(items.map((i) => refOf(i, collection)?.id).filter(Boolean))
  const uploadHref = `/admin/collections/${collection}/create`

  const choose = (m: Doc) => {
    if (!hasMany) {
      onChange(m)
      setOpen(false)
      return
    }
    const id = String(m.id)
    onChange(
      selectedIds.has(id) ? items.filter((i) => refOf(i, collection)?.id !== id) : [...items, m],
    )
  }
  const remove = (id: string) =>
    onChange(hasMany ? items.filter((i) => refOf(i, collection)?.id !== id) : null)

  return (
    <div>
      <FieldLabel label={field.label ?? label} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {items.length === 0 && <div style={thumb}>None</div>}
        {items.map((item, i) => {
          const doc = docOf(item)
          const src = doc?.thumbnailURL || doc?.url || null
          const id = refOf(item, collection)?.id ?? ''
          return (
            <div key={id || i} style={{ position: 'relative' }}>
              <div style={thumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src ? <img alt={doc?.alt ?? ''} src={src} style={cover} /> : `#${id}`}
              </div>
              {!readOnly && hasMany && (
                <button
                  aria-label="Remove"
                  onClick={() => remove(id)}
                  style={removeBtn}
                  title="Remove"
                  type="button"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
        {!readOnly && (
          <>
            <button onClick={() => setOpen((o) => !o)} style={btn} type="button">
              {open ? 'Close' : items.length ? (hasMany ? 'Add' : 'Change') : 'Choose'}
            </button>
            {!hasMany && items.length > 0 && (
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
                  onClick={() => choose(m)}
                  style={{
                    ...btn,
                    padding: 0,
                    aspectRatio: '4 / 3',
                    overflow: 'hidden',
                    outline: selectedIds.has(String(m.id)) ? '2px solid #1f6a78' : undefined,
                  }}
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

const input: React.CSSProperties = {
  width: '100%',
  border: '1px solid #ccc',
  borderRadius: 4,
  padding: '6px 8px',
  fontSize: 13,
  background: '#fff',
}
const btn: React.CSSProperties = {
  border: '1px solid #ccc',
  borderRadius: 4,
  background: '#fff',
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
}
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
const removeBtn: React.CSSProperties = {
  position: 'absolute',
  top: -6,
  right: -6,
  width: 18,
  height: 18,
  borderRadius: '50%',
  border: 0,
  background: '#333',
  color: '#fff',
  fontSize: 12,
  lineHeight: '18px',
  cursor: 'pointer',
  padding: 0,
}
