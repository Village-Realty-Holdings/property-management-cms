import type { Data } from '@puckeditor/core'

import type { Page } from '@/payload-types'

import { containerSlugAt, isContainerSlug, MAX_CONTAINER_DEPTH } from '@/blocks/Container/config'

import type { BlockSchema, FieldSchema } from './schema'

/**
 * Payload's `layout` blocks array is the source of truth. These pure functions
 * translate it to and from Puck's data tree for the visual editor.
 *
 * - Payload `{ blockType, id, ...fields }` ↔ Puck `{ type: blockType, props: { id, ...fields } }`.
 * - Upload and relationship fields hold populated docs (depth 1) inside the
 *   editor so the canvas can show images and titles; Payload wants ids back,
 *   so `puckToLayout` walks the block schema and reduces them.
 * - Nested blocks fields (a container's `blocks`) are Puck slots: rows become
 *   items on the way in and back on the way out. Only the empty trailing
 *   placeholder is dropped on save; intentional empty columns survive.
 * - Payload models container depth as separate blocks (`container`,
 *   `container2`, …); the editor sees one `container` and the slug is chosen
 *   by depth on save, so moving a container between levels just works.
 * - Everything else the schema does not describe (rich text, `blockName`)
 *   passes through untouched.
 */

export type LayoutBlock = NonNullable<Page['layout']>[number]

/** Reserved for the automatic trailing add affordance, never for user-created containers. */
export const PLACEHOLDER_ID_PREFIX = 'editor-placeholder-'
export type PuckData = Data
export type PuckItem = PuckData['content'][number]

export const emptyPuckData = (): PuckData => ({ root: { props: {} }, content: [], zones: {} })

/** Puck needs a string id on every item; Payload block rows usually have one. */
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Rows of a Payload blocks field: objects that carry a `blockType`. */
const isRows = (value: unknown): value is LayoutRow[] =>
  Array.isArray(value) &&
  value.every((r) => r && typeof r === 'object' && typeof (r as LayoutRow).blockType === 'string')

/** Items of a Puck slot: objects that carry `type` and `props`. */
const isItems = (value: unknown): value is PuckItem[] =>
  Array.isArray(value) &&
  value.every(
    (i) =>
      i &&
      typeof i === 'object' &&
      typeof (i as PuckItem).type === 'string' &&
      typeof (i as PuckItem).props === 'object',
  )

type LayoutRow = { blockType: string; id?: string | null } & Record<string, unknown>

/** One Payload block row to a Puck item; nested blocks fields become slots (recursively). */
export function rowToItem(block: LayoutRow): PuckItem {
  const { blockType, id, ...rest } = block
  const props: Record<string, unknown> = { ...rest, id: id ?? newId() }
  for (const [key, value] of Object.entries(props)) {
    if (key !== 'id' && Array.isArray(value) && (value.length === 0 ? false : isRows(value)))
      props[key] = value.map(rowToItem)
  }
  return { type: isContainerSlug(blockType) ? 'container' : blockType, props } as PuckItem
}

export function layoutToPuck(layout: Page['layout'] | null | undefined): PuckData {
  const content = (layout ?? []).map((block) => rowToItem(block as unknown as LayoutRow))
  return { root: { props: {} }, content, zones: {} }
}

type RelationValue = unknown

/** A populated doc, an id, or a polymorphic `{ relationTo, value }` back to what Payload stores. */
export const toRelationId = (value: RelationValue): unknown => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if ('relationTo' in obj && 'value' in obj)
      return { relationTo: obj.relationTo, value: toRelationId(obj.value) }
    if ('id' in obj) return obj.id
  }
  return null
}

/** Reduce populated relations to ids, guided by the field schema. */
export function normalizeRelations(
  props: Record<string, unknown>,
  fields: FieldSchema[],
): Record<string, unknown> {
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
      if (value && typeof value === 'object')
        out[field.name] = normalizeRelations(value as Record<string, unknown>, field.fields)
    } else if (field.kind === 'array') {
      if (Array.isArray(value)) {
        out[field.name] = value.map((row) =>
          row && typeof row === 'object'
            ? normalizeRelations(row as Record<string, unknown>, field.fields)
            : row,
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

/** Deepest container nesting in a Puck tree; 0 when it holds no container. */
export function containerDepth(items: unknown, depth = 0): number {
  if (!Array.isArray(items)) return depth
  let max = depth
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const { type, props } = item as { type?: unknown; props?: Record<string, unknown> }
    const own = type === 'container' ? depth + 1 : depth
    for (const value of Object.values(props ?? {}))
      max = Math.max(max, own, containerDepth(value, own))
  }
  return max
}

/**
 * One Puck item back to a Payload row; slots become blocks rows, empty
 * placeholder is dropped at the root, and a container's slug follows its depth.
 */
export function itemToRow(item: PuckItem, schemas: BlockSchema[], depth = 1): LayoutRow {
  const schema = schemas.find((b) => b.slug === item.type)
  if (!schema) throw new Error(`Unknown visual editor component "${String(item.type)}"`)
  const isContainer = item.type === 'container'
  if (isContainer && depth > MAX_CONTAINER_DEPTH)
    throw new Error(`Containers can only nest ${MAX_CONTAINER_DEPTH} levels deep`)
  const { id, ...props } = item.props as Record<string, unknown> & { id: string }
  for (const [key, value] of Object.entries(props)) {
    if (Array.isArray(value) && value.length > 0 && isItems(value)) {
      props[key] = value.map((child) => itemToRow(child, schemas, isContainer ? depth + 1 : depth))
    }
  }
  const block = normalizeRelations(props, schema.fields)
  return { ...block, id, blockType: isContainer ? containerSlugAt(depth) : schema.slug }
}

/**
 * Puck's tree back to Payload's layout. `schemas` is the full block list; a
 * nested block uses the same schema as it does at the top level.
 */
export function puckToLayout(
  data: Pick<PuckData, 'content'>,
  schemas: BlockSchema[],
): LayoutBlock[] {
  return data.content
    .filter(
      (item) =>
        !(
          item.type === 'container' &&
          item.props.id.startsWith(PLACEHOLDER_ID_PREFIX) &&
          !(Array.isArray(item.props.blocks) && item.props.blocks.length > 0)
        ),
    )
    .map((item) => itemToRow(item, schemas)) as unknown as LayoutBlock[]
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
          ? field.defaultValue.map((row) => ({
              ...defaultProps(field.fields),
              ...asRecord(row),
              id: newId(),
            }))
          : []
        break
      case 'blocks':
        out[field.name] = Array.isArray(field.defaultValue)
          ? field.defaultValue.flatMap((row) => {
              const block = asRecord(row)
              const schema = field.blocks.find((b) => b.slug === block.blockType)
              return schema
                ? [
                    {
                      ...defaultProps(schema.fields),
                      ...block,
                      id: newId(),
                      blockType: schema.slug,
                    },
                  ]
                : []
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

const asRecord = (row: unknown): Record<string, unknown> =>
  row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
