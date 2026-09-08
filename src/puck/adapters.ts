import type { Data } from '@puckeditor/core'

import type { Page } from '@/payload-types'

import type { BlockSchema, FieldSchema } from './schema'

/**
 * Payload's `layout` blocks array is the source of truth. These pure functions
 * translate it to and from Puck's data tree for the visual editor.
 *
 * - Payload `{ blockType, id, ...fields }` ↔ Puck `{ type: blockType, props: { id, ...fields } }`.
 * - Upload and relationship fields hold populated docs (depth 1) inside the
 *   editor so the canvas can show images and titles; Payload wants ids back,
 *   so `puckToLayout` walks the block schema and reduces them.
 * - Everything the schema does not describe (rich text, nested blocks,
 *   `blockName`) passes through untouched.
 */

export type LayoutBlock = NonNullable<Page['layout']>[number]
export type PuckData = Data
export type PuckItem = PuckData['content'][number]

export const emptyPuckData = (): PuckData => ({ root: { props: {} }, content: [], zones: {} })

/** Puck needs a string id on every item; Payload block rows usually have one. */
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export function layoutToPuck(layout: Page['layout'] | null | undefined): PuckData {
  const content = (layout ?? []).map((block) => {
    const { blockType, id, ...props } = block as LayoutBlock & { id?: string | null }
    return { type: blockType, props: { ...props, id: id ?? newId() } }
  })
  return { root: { props: {} }, content, zones: {} }
}

type RelationValue = unknown

/** A populated doc, an id, or a polymorphic `{ relationTo, value }` back to what Payload stores. */
export const toRelationId = (value: RelationValue): unknown => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if ('relationTo' in obj && 'value' in obj) return { relationTo: obj.relationTo, value: toRelationId(obj.value) }
    if ('id' in obj) return obj.id
  }
  return null
}

/** Reduce populated relations to ids, guided by the field schema. */
export function normalizeRelations(props: Record<string, unknown>, fields: FieldSchema[]): Record<string, unknown> {
  const out = { ...props }
  for (const field of fields) {
    if (!(field.name in out)) continue
    const value = out[field.name]
    if (field.kind === 'relation') {
      out[field.name] = field.hasMany
        ? Array.isArray(value)
          ? value.map(toRelationId).filter((v) => v !== null)
          : []
        : toRelationId(value)
    } else if (field.kind === 'group') {
      if (value && typeof value === 'object') out[field.name] = normalizeRelations(value as Record<string, unknown>, field.fields)
    } else if (field.kind === 'array') {
      if (Array.isArray(value)) {
        out[field.name] = value.map((row) =>
          row && typeof row === 'object' ? normalizeRelations(row as Record<string, unknown>, field.fields) : row,
        )
      }
    } else if (field.kind === 'blocks') {
      if (Array.isArray(value)) {
        out[field.name] = value.map((row) => {
          if (!row || typeof row !== 'object') return row
          const block = row as Record<string, unknown>
          const schema = field.blocks.find((b) => b.slug === block.blockType)
          return schema ? normalizeRelations(block, schema.fields) : block
        })
      }
    }
  }
  return out
}

export function puckToLayout(data: Pick<PuckData, 'content'>, schemas: BlockSchema[]): LayoutBlock[] {
  return data.content.map((item) => {
    const schema = schemas.find((b) => b.slug === item.type)
    if (!schema) throw new Error(`Unknown visual editor component "${String(item.type)}"`)
    const { id, ...props } = item.props as Record<string, unknown> & { id: string }
    const block = normalizeRelations(props, schema.fields)
    return { ...block, id, blockType: schema.slug } as unknown as LayoutBlock
  })
}

/**
 * Starting props for a freshly dropped block: the literal defaults from the
 * Payload config, applied the way Payload's own beforeValidate does it. Rows
 * in an array or blocks default are filled in with their fields' defaults, so
 * `[{ blockType: 'content' }]` becomes a complete content block.
 */
export function defaultProps(fields: FieldSchema[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of fields) {
    switch (field.kind) {
      case 'scalar':
        if (field.defaultValue !== undefined) out[field.name] = field.defaultValue
        else if (field.type === 'checkbox') out[field.name] = false
        else if (field.hasMany) out[field.name] = []
        break
      case 'choice':
        if (field.defaultValue !== undefined) out[field.name] = field.defaultValue
        else if (field.hasMany) out[field.name] = []
        break
      case 'relation':
        out[field.name] = field.hasMany ? [] : null
        break
      case 'array':
        out[field.name] = Array.isArray(field.defaultValue)
          ? field.defaultValue.map((row) => ({ ...defaultProps(field.fields), ...asRecord(row), id: newId() }))
          : []
        break
      case 'blocks':
        out[field.name] = Array.isArray(field.defaultValue)
          ? field.defaultValue.flatMap((row) => {
              const block = asRecord(row)
              const schema = field.blocks.find((b) => b.slug === block.blockType)
              return schema ? [{ ...defaultProps(schema.fields), ...block, id: newId(), blockType: schema.slug }] : []
            })
          : []
        break
      case 'group':
        out[field.name] = defaultProps(field.fields)
        break
      case 'richText':
        if (field.defaultValue !== undefined) out[field.name] = field.defaultValue
        break
    }
  }
  return out
}

const asRecord = (row: unknown): Record<string, unknown> => (row && typeof row === 'object' ? (row as Record<string, unknown>) : {})
