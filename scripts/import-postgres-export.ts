/**
 * Imports a depth-0 JSON export of the old Postgres database into the D1
 * database this config points at (local by default; NODE_ENV=production
 * targets remote D1). IDs are reassigned, so every relationship, upload and
 * rich-text link is remapped by walking the collection field config.
 *
 * Idempotent: documents are matched on a natural key (email, slug, filename,
 * title, tenant) and updated when they already exist.
 *
 * Run with: pnpm import:postgres <export.json> [media-dir]
 */
import configPromise from '@payload-config'
import { getPayload, type Field, type Payload, type Block } from 'payload'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const [exportFile, mediaDirArg] = process.argv.slice(2)
if (!exportFile) throw new Error('usage: import-postgres-export.ts <export.json> [media-dir]')
const mediaDir = mediaDirArg ?? path.resolve('public/media')
const dump: Record<string, any[]> = JSON.parse(fs.readFileSync(exportFile, 'utf8'))

const context = { disableRevalidate: true }
const ORDER = [
  'users', 'tenants', 'payload-folders', 'media', 'categories', 'forms', 'pages', 'posts',
  'header', 'footer', 'theme', 'redirects', 'form-submissions',
]
const GENERATED = new Set(['id', 'createdAt', 'updatedAt'])
const MEDIA_GENERATED = new Set(['url', 'thumbnailURL', 'sizes', 'filesize', 'width', 'height', 'mimeType'])
const USER_STRIPPED = new Set(['hash', 'salt', 'sessions', 'loginAttempts', 'lockUntil', 'resetPasswordToken', 'resetPasswordExpiration'])

// old id -> new id, per collection
const idMap: Record<string, Map<string | number, string | number>> = {}
const mapId = (collection: string, old: unknown) => {
  if (old === null || old === undefined) return old
  const key = typeof old === 'object' ? (old as any).id : old
  return idMap[collection]?.get(key) ?? null
}

// ---- field walker ---------------------------------------------------------

function remapRel(field: any, value: any): any {
  if (value === null || value === undefined) return value
  if (field.hasMany && Array.isArray(value)) return value.map((v) => remapRel({ ...field, hasMany: false }, v)).filter((v) => v !== null)
  if (Array.isArray(field.relationTo)) {
    if (typeof value === 'object' && 'relationTo' in value) {
      const mapped = mapId(value.relationTo, value.value)
      return mapped === null ? null : { relationTo: value.relationTo, value: mapped }
    }
    return null
  }
  return mapId(field.relationTo, value)
}

function remapLexical(node: any): any {
  if (!node || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map(remapLexical)
  const out: any = {}
  for (const [k, v] of Object.entries(node)) out[k] = remapLexical(v)
  if (out.type === 'upload' || out.type === 'relationship') {
    const mapped = mapId(out.relationTo, out.value)
    out.value = mapped
  }
  if (out.type === 'link' && out.fields?.doc && typeof out.fields.doc === 'object') {
    const mapped = mapId(out.fields.doc.relationTo, out.fields.doc.value)
    out.fields.doc = mapped === null ? null : { relationTo: out.fields.doc.relationTo, value: mapped }
  }
  return out
}

function remapFields(fields: Field[], data: any): any {
  if (!data || typeof data !== 'object') return data
  const out = { ...data }
  for (const field of fields as any[]) {
    switch (field.type) {
      case 'relationship':
      case 'upload':
        if (field.name in out) out[field.name] = remapRel(field, out[field.name])
        break
      case 'array':
        if (Array.isArray(out[field.name])) out[field.name] = out[field.name].map((row: any) => remapFields(field.fields, row))
        break
      case 'blocks':
        if (Array.isArray(out[field.name])) {
          out[field.name] = out[field.name].map((row: any) => {
            const block: Block | undefined = (field.blocks as Block[]).find((b) => b.slug === row.blockType)
            return block ? remapFields(block.fields, row) : row
          })
        }
        break
      case 'group':
        if (field.name) out[field.name] = remapFields(field.fields, out[field.name])
        else Object.assign(out, remapFields(field.fields, out))
        break
      case 'row':
      case 'collapsible':
        Object.assign(out, remapFields(field.fields, out))
        break
      case 'tabs':
        for (const tab of field.tabs) {
          if ('name' in tab && tab.name) out[tab.name] = remapFields(tab.fields, out[tab.name])
          else Object.assign(out, remapFields(tab.fields, out))
        }
        break
      case 'richText':
        if (out[field.name]) out[field.name] = remapLexical(out[field.name])
        break
    }
  }
  return out
}

// ---- natural keys for idempotency --------------------------------------

function naturalKey(collection: string, doc: any): Record<string, any> | null {
  switch (collection) {
    case 'users': return { email: { equals: doc.email } }
    case 'tenants': return { slug: { equals: doc.slug } }
    case 'media': return { filename: { equals: doc.filename } }
    case 'pages': case 'posts': case 'categories':
      return { and: [{ slug: { equals: doc.slug } }, { tenant: { equals: mapId('tenants', doc.tenant) } }] }
    case 'forms': return { and: [{ title: { equals: doc.title } }, { tenant: { equals: mapId('tenants', doc.tenant) } }] }
    case 'header': case 'footer': case 'theme': case 'site-settings':
      return { tenant: { equals: mapId('tenants', doc.tenant) } }
    case 'redirects': return { from: { equals: doc.from } }
    case 'payload-folders': return { name: { equals: doc.name } }
    default: return null
  }
}

function prepare(collection: string, doc: any) {
  const data: any = {}
  for (const [k, v] of Object.entries(doc)) {
    if (GENERATED.has(k)) continue
    if (collection === 'media' && MEDIA_GENERATED.has(k)) continue
    if (collection === 'users' && USER_STRIPPED.has(k)) continue
    data[k] = v
  }
  if (collection === 'users') data.password = crypto.randomBytes(24).toString('hex') // replaced by the old hash below
  return data
}

async function upsert(payload: Payload, collection: string, doc: any, pass: 1 | 2) {
  const fields = payload.collections[collection].config.fields
  const data = remapFields(fields, prepare(collection, doc))
  const where = naturalKey(collection, doc)
  const existing = where ? (await payload.find({ collection: collection as any, where, limit: 1, depth: 0 })).docs[0] : undefined
  const mapped = idMap[collection].get(doc.id)
  const id = mapped ?? existing?.id

  // Pass 1 saves versioned collections as drafts so required relationships to
  // documents that do not exist yet do not fail validation; pass 2 publishes.
  const hasDrafts = Boolean((payload.collections[collection].config.versions as any)?.drafts)
  const draft = pass === 1 && hasDrafts
  if (hasDrafts) data._status = draft ? 'draft' : (doc._status ?? 'published')
  const opts: any = { collection, data, context, depth: 0, draft }
  if (collection === 'media') {
    const file = path.join(mediaDir, doc.filename)
    if (!fs.existsSync(file)) { payload.logger.warn(`media ${doc.filename}: file missing in ${mediaDir}, skipping`); return }
    if (!id) Object.assign(opts, { filePath: file, overwriteExistingFiles: true })
  }

  let result: any
  if (id) {
    if (collection === 'media') delete opts.data.filename
    result = await payload.update({ ...opts, id })
  } else {
    result = await payload.create(opts)
  }
  idMap[collection].set(doc.id, result.id)

  if (collection === 'users' && doc.hash && doc.salt) {
    await payload.db.updateOne({ collection: 'users', id: result.id, data: { hash: doc.hash, salt: doc.salt }, req: undefined as any })
  }
  if (pass === 1) payload.logger.info(`${collection} ${doc.id} -> ${result.id} (${id ? 'updated' : 'created'})`)
}

async function run() {
  const payload = await getPayload({ config: configPromise })
  for (const c of ORDER) idMap[c] = new Map()

  // Pass 1 creates every document; relationships to documents not yet created come through as null.
  // Pass 2 rewrites every document with the complete id map.
  for (const pass of [1, 2] as const) {
    payload.logger.info(`--- pass ${pass}`)
    for (const collection of ORDER) {
      const docs = dump[collection] ?? []
      if (!payload.collections[collection]) { if (docs.length) payload.logger.warn(`${collection}: not in config, skipped`); continue }
      for (const doc of docs) await upsert(payload, collection, doc, pass)
    }
  }
  payload.logger.info('Done.')
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
