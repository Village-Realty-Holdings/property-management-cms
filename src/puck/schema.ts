import type { Block, Field, Tab } from 'payload'

/**
 * A JSON-safe description of the Pages `layout` blocks, derived from the live
 * Payload config on the server and handed to the visual editor on the client.
 *
 * Deriving it at runtime means every block in the layout field shows up in
 * the editor without a hand-written mapping, and a renamed or added field is
 * picked up automatically. Functions on the Payload config (conditions,
 * validators, custom components) are not carried across; the form view stays
 * the full editor for anything the sidebar cannot express.
 */

export type Option = { label: string; value: string }

export type FieldSchema =
  | { kind: 'scalar'; name: string; label: string; type: ScalarType; hasMany?: boolean; min?: number; max?: number; defaultValue?: unknown }
  | { kind: 'choice'; name: string; label: string; type: 'select' | 'radio'; options: Option[]; hasMany?: boolean; defaultValue?: unknown }
  | { kind: 'relation'; name: string; label: string; type: 'upload' | 'relationship'; relationTo: string | string[]; hasMany?: boolean }
  | { kind: 'richText'; name: string; label: string; defaultValue?: unknown }
  | { kind: 'array'; name: string; label: string; fields: FieldSchema[]; minRows?: number; maxRows?: number; defaultValue?: unknown }
  | { kind: 'group'; name: string; label: string; fields: FieldSchema[] }
  | { kind: 'blocks'; name: string; label: string; blocks: BlockSchema[]; defaultValue?: unknown }

export type ScalarType = 'text' | 'textarea' | 'number' | 'checkbox' | 'date' | 'email' | 'code' | 'json' | 'point'

export type BlockSchema = { slug: string; label: string; group?: string; fields: FieldSchema[] }

const SCALARS: ScalarType[] = ['text', 'textarea', 'number', 'checkbox', 'date', 'email', 'code', 'json', 'point']

/** Payload labels can be a string, a locale map, `false` or a function. */
export function labelOf(label: unknown, fallback: string): string {
  if (typeof label === 'string') return label
  if (label && typeof label === 'object') {
    const map = label as Record<string, string>
    return map.en ?? Object.values(map)[0] ?? humanize(fallback)
  }
  return humanize(fallback)
}

export const humanize = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())

function optionsOf(options: unknown): Option[] {
  if (!Array.isArray(options)) return []
  return options.map((o) =>
    typeof o === 'string' ? { label: humanize(o), value: o } : { label: labelOf(o.label, String(o.value)), value: String(o.value) },
  )
}

export function fieldsToSchema(fields: Field[], registry: Block[] = [], stack: string[] = []): FieldSchema[] {
  const out: FieldSchema[] = []
  for (const field of fields) {
    // Layout-only fields contribute their children to the same level.
    if (field.type === 'row' || field.type === 'collapsible') {
      out.push(...fieldsToSchema(field.fields, registry, stack))
      continue
    }
    if (field.type === 'tabs') {
      for (const tab of field.tabs as Tab[]) {
        if ('name' in tab && tab.name) {
          out.push({ kind: 'group', name: tab.name, label: labelOf(tab.label, tab.name), fields: fieldsToSchema(tab.fields, registry, stack) })
        } else {
          out.push(...fieldsToSchema(tab.fields, registry, stack))
        }
      }
      continue
    }
    if (field.type === 'group' && !('name' in field && field.name)) {
      out.push(...fieldsToSchema(field.fields, registry, stack))
      continue
    }
    if (field.type === 'ui' || field.type === 'join') continue
    if (!('name' in field) || !field.name) continue

    const name = field.name
    const label = labelOf(field.label, name)

    if (field.type === 'select' || field.type === 'radio') {
      out.push({
        kind: 'choice',
        name,
        label,
        type: field.type,
        options: optionsOf(field.options),
        hasMany: field.type === 'select' ? Boolean(field.hasMany) : false,
        defaultValue: literal(field.defaultValue),
      })
    } else if (field.type === 'upload' || field.type === 'relationship') {
      out.push({ kind: 'relation', name, label, type: field.type, relationTo: field.relationTo as string | string[], hasMany: Boolean(field.hasMany) })
    } else if (field.type === 'richText') {
      out.push({ kind: 'richText', name, label, defaultValue: literal(field.defaultValue) })
    } else if (field.type === 'array') {
      out.push({
        kind: 'array',
        name,
        label,
        fields: fieldsToSchema(field.fields, registry, stack),
        minRows: field.minRows,
        maxRows: field.maxRows,
        defaultValue: literal(field.defaultValue),
      })
    } else if (field.type === 'group') {
      out.push({ kind: 'group', name, label, fields: fieldsToSchema(field.fields, registry, stack) })
    } else if (field.type === 'blocks') {
      out.push({ kind: 'blocks', name, label, blocks: blocksToSchema(resolveBlocks(field, registry), registry, stack), defaultValue: literal(field.defaultValue) })
    } else if ((SCALARS as string[]).includes(field.type)) {
      const scalar: FieldSchema = { kind: 'scalar', name, label, type: field.type as ScalarType, defaultValue: literal(field.defaultValue) }
      if ('hasMany' in field && field.hasMany) scalar.hasMany = true
      if (field.type === 'number') {
        if (typeof field.min === 'number') scalar.min = field.min
        if (typeof field.max === 'number') scalar.max = field.max
      }
      out.push(scalar)
    }
  }
  return out
}

/** Only literal defaults survive; function defaults need a request. */
const literal = (value: unknown) => (typeof value === 'function' ? undefined : value)

/**
 * Blocks of a blocks field: inline block objects, or slugs resolved against
 * `config.blocks` when the field uses `blockReferences`. Unknown slugs are
 * skipped.
 */
export function resolveBlocks(field: { blocks?: Block[]; blockReferences?: (Block | string)[] }, registry: Block[] = []): Block[] {
  const refs = field.blockReferences ?? field.blocks ?? []
  return refs
    .map((ref) => (typeof ref === 'string' ? registry.find((b) => b.slug === ref) : ref))
    .filter((b): b is Block => Boolean(b))
}

/**
 * @param registry `config.blocks`, needed to resolve slug references.
 * @param stack slugs being described further up; a block that contains itself
 * (a container of containers) is listed by slug only where it recurs, since the
 * editor only needs the slug to allow it in a slot.
 */
export function blocksToSchema(blocks: Block[], registry: Block[] = [], stack: string[] = []): BlockSchema[] {
  return blocks.map((block) => ({
    slug: block.slug,
    label: labelOf(block.labels?.singular, block.slug),
    group: typeof block.admin?.group === 'string' ? block.admin.group : undefined,
    fields: stack.includes(block.slug) ? [] : fieldsToSchema(block.fields, registry, [...stack, block.slug]),
  }))
}

/** The blocks of the field called `name`, wherever it sits in tabs, rows or groups. */
export function findBlocksField(fields: Field[], name: string, registry: Block[] = []): Block[] | null {
  for (const field of fields) {
    if (field.type === 'blocks' && field.name === name) return resolveBlocks(field, registry)
    if (field.type === 'tabs') {
      for (const tab of field.tabs as Tab[]) {
        const found = findBlocksField(tab.fields, name, registry)
        if (found) return found
      }
    } else if ('fields' in field && Array.isArray(field.fields)) {
      const found = findBlocksField(field.fields as Field[], name, registry)
      if (found) return found
    }
  }
  return null
}
