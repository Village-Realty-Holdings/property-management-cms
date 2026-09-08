import type { Payload, PayloadRequest } from 'payload'

import { getServerSideURL } from '@/lib/getURL'
import { remapFields, type MapId } from '@/lib/remapRelations'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Copies one tenant's site into another: media, forms, categories, posts,
 * pages and the per-tenant globals. Every relationship is rewritten to the
 * copies, so the new site links to its own pages and photos.
 *
 * Versioned collections are created as drafts first and published on a
 * second pass, so a page can point at a page that is copied after it.
 */
const ORDER = ['media', 'forms', 'categories', 'posts', 'pages', 'header', 'footer', 'theme', 'site-settings'] as const

const SKIP = new Set(['id', 'createdAt', 'updatedAt', 'tenant', 'folder'])
const MEDIA_GENERATED = new Set(['url', 'thumbnailURL', 'sizes', 'filesize', 'width', 'height', 'mimeType', 'filename'])

type Id = number | string

export async function cloneTenantContent({
  payload,
  from,
  to,
  req,
}: {
  payload: Payload
  from: Id
  to: Id
  req?: PayloadRequest
}) {
  const ids: Partial<Record<(typeof ORDER)[number], Map<Id, Id>>> = {}
  for (const c of ORDER) ids[c] = new Map()
  // Collections that are not copied (users, tenants) keep their ids.
  const mapId: MapId = (collection, old) => {
    const map = ids[collection as (typeof ORDER)[number]]
    if (!map) return old
    return map.get(old as Id) ?? null
  }
  const context = { disableRevalidate: true, cloneTenant: true }

  const sources: Partial<Record<(typeof ORDER)[number], any[]>> = {}
  for (const collection of ORDER) {
    if (!payload.collections[collection]) continue
    const { docs } = await payload.find({
      collection,
      where: { tenant: { equals: from } },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })
    sources[collection] = docs
  }

  for (const pass of [1, 2] as const) {
    for (const collection of ORDER) {
      const config = payload.collections[collection]?.config
      if (!config) continue
      const hasDrafts = Boolean((config.versions as any)?.drafts)
      // Only versioned collections need the publishing pass.
      if (pass === 2 && !hasDrafts) continue

      for (const source of sources[collection] ?? []) {
        const data: any = {}
        for (const [k, v] of Object.entries(source)) {
          if (SKIP.has(k)) continue
          if (collection === 'media' && MEDIA_GENERATED.has(k)) continue
          data[k] = v
        }
        Object.assign(data, remapFields(config.fields, data, mapId), { tenant: to })

        const draft = pass === 1 && hasDrafts
        if (hasDrafts) data._status = draft ? 'draft' : (source._status ?? 'published')

        const existing = ids[collection]!.get(source.id)
        if (existing) {
          await payload.update({ collection, id: existing, data, depth: 0, draft, context, overrideAccess: true, req })
          continue
        }

        const opts: any = { collection, data, depth: 0, draft, context, overrideAccess: true, req }
        if (collection === 'media') opts.file = await fetchFile(source)
        const created = await payload.create(opts)
        ids[collection]!.set(source.id, created.id)
      }
    }
  }

  payload.logger.info(`tenant ${to}: copied ${Object.values(ids).reduce((n, m) => n + m.size, 0)} documents from tenant ${from}`)
}

/** Reads the original upload back through its public URL so it can be stored again for the copy. */
async function fetchFile(media: { url?: string | null; filename?: string | null; mimeType?: string | null }) {
  if (!media.url || !media.filename) throw new Error(`media ${media.filename ?? '?'} has no file`)
  const url = media.url.startsWith('http') ? media.url : `${getServerSideURL()}${media.url}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`could not read ${url}: ${res.status}`)
  const data = Buffer.from(await res.arrayBuffer())
  return { data, name: media.filename, mimetype: media.mimeType ?? res.headers.get('content-type') ?? 'application/octet-stream', size: data.byteLength }
}
