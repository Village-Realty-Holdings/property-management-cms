import type { Block, Field } from 'payload'

/**
 * Rewrites every relationship, upload and rich-text link in a document by
 * walking the collection's field config, so ids can be translated from one
 * database or tenant to another. `mapId` returns the new id, `null` to drop
 * the relation, or the old id to leave it alone.
 */
export type MapId = (collection: string, old: unknown) => unknown

/* eslint-disable @typescript-eslint/no-explicit-any */

const idOf = (value: unknown) => (typeof value === 'object' && value !== null ? (value as any).id : value)

function remapRel(field: any, value: any, mapId: MapId): any {
  if (value === null || value === undefined) return value
  if (field.hasMany && Array.isArray(value)) {
    return value.map((v) => remapRel({ ...field, hasMany: false }, v, mapId)).filter((v) => v !== null)
  }
  if (Array.isArray(field.relationTo)) {
    if (typeof value === 'object' && 'relationTo' in value) {
      const mapped = mapId(value.relationTo, idOf(value.value))
      return mapped === null ? null : { relationTo: value.relationTo, value: mapped }
    }
    return null
  }
  return mapId(field.relationTo, idOf(value))
}

function remapLexical(node: any, mapId: MapId): any {
  if (!node || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map((n) => remapLexical(n, mapId))
  const out: any = {}
  for (const [k, v] of Object.entries(node)) out[k] = remapLexical(v, mapId)
  if (out.type === 'upload' || out.type === 'relationship') out.value = mapId(out.relationTo, idOf(out.value))
  if (out.type === 'link' && out.fields?.doc && typeof out.fields.doc === 'object') {
    const mapped = mapId(out.fields.doc.relationTo, idOf(out.fields.doc.value))
    out.fields.doc = mapped === null ? null : { relationTo: out.fields.doc.relationTo, value: mapped }
  }
  return out
}

export function remapFields(fields: Field[], data: any, mapId: MapId): any {
  if (!data || typeof data !== 'object') return data
  const out = { ...data }
  for (const field of fields as any[]) {
    switch (field.type) {
      case 'relationship':
      case 'upload':
        if (field.name in out) out[field.name] = remapRel(field, out[field.name], mapId)
        break
      case 'array':
        if (Array.isArray(out[field.name])) out[field.name] = out[field.name].map((row: any) => remapFields(field.fields, row, mapId))
        break
      case 'blocks':
        if (Array.isArray(out[field.name])) {
          out[field.name] = out[field.name].map((row: any) => {
            const block: Block | undefined = (field.blocks as Block[]).find((b) => b.slug === row.blockType)
            return block ? remapFields(block.fields, row, mapId) : row
          })
        }
        break
      case 'group':
        if (field.name) out[field.name] = remapFields(field.fields, out[field.name], mapId)
        else Object.assign(out, remapFields(field.fields, out, mapId))
        break
      case 'row':
      case 'collapsible':
        Object.assign(out, remapFields(field.fields, out, mapId))
        break
      case 'tabs':
        for (const tab of field.tabs) {
          if ('name' in tab && tab.name) out[tab.name] = remapFields(tab.fields, out[tab.name], mapId)
          else Object.assign(out, remapFields(tab.fields, out, mapId))
        }
        break
      case 'richText':
        if (out[field.name]) out[field.name] = remapLexical(out[field.name], mapId)
        break
    }
  }
  return out
}
