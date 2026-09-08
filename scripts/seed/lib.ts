/**
 * Shared helpers for the seed scripts. Everything is idempotent: a document
 * is matched on a natural key within its tenant, then created or updated.
 */
import type { Payload } from 'payload'

import { heading, paragraph, richTextDefault } from '@/fields/richTextDefault'

// Hooks call revalidateTag, which only works inside a Next request.
export const context = { disableRevalidate: true }

export type TenantId = number | string

type Slug = 'site-settings' | 'header' | 'footer' | 'theme'

/** One-per-tenant documents (the multi-tenant plugin's `isGlobal` collections). */
export async function upsertGlobal(payload: Payload, collection: Slug, tenant: TenantId, data: object) {
  const { docs } = await payload.find({ collection, where: { tenant: { equals: tenant } }, limit: 1 })
  const body = { ...data, tenant } as any
  if (docs[0]) {
    await payload.update({ collection, id: docs[0].id, data: body, context })
    payload.logger.info(`${collection}: updated`)
  } else {
    await payload.create({ collection, data: body, context })
    payload.logger.info(`${collection}: created`)
  }
}

/** Downloads an image and stores it as a media document, matched by filename. */
export async function upsertMedia(
  payload: Payload,
  tenant: TenantId,
  { url, filename, alt }: { url: string; filename: string; alt: string },
) {
  const { docs } = await payload.find({
    collection: 'media',
    where: { and: [{ filename: { equals: filename } }, { tenant: { equals: tenant } }] },
    limit: 1,
  })
  if (docs[0]) {
    await payload.update({ collection: 'media', id: docs[0].id, data: { alt }, context })
    payload.logger.info(`media ${filename}: updated`)
    return docs[0].id
  }

  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (seed)' } })
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`)
  const data = Buffer.from(await res.arrayBuffer())
  const doc = await payload.create({
    collection: 'media',
    data: { alt, tenant } as any,
    file: { data, name: filename, mimetype: res.headers.get('content-type') ?? 'image/jpeg', size: data.byteLength },
    context,
  })
  payload.logger.info(`media ${filename}: created (id ${doc.id})`)
  return doc.id
}

export async function upsertForm(payload: Payload, tenant: TenantId, data: { title: string } & Record<string, unknown>) {
  const { docs } = await payload.find({
    collection: 'forms',
    where: { and: [{ title: { equals: data.title } }, { tenant: { equals: tenant } }] },
    limit: 1,
  })
  const body = { ...data, tenant } as any
  const doc = docs[0]
    ? await payload.update({ collection: 'forms', id: docs[0].id, data: body, context })
    : await payload.create({ collection: 'forms', data: body, context })
  payload.logger.info(`form "${data.title}": ${docs[0] ? 'updated' : 'created'} (id ${doc.id})`)
  return doc.id
}

/** Creates or replaces a published page, matched by slug within the tenant. */
export async function upsertPage(
  payload: Payload,
  tenant: TenantId,
  data: { title: string; slug: string; layout: Record<string, unknown>[]; meta?: Record<string, unknown> },
) {
  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: data.slug } }, { tenant: { equals: tenant } }] },
    limit: 1,
    draft: false,
  })
  const body = { ...data, tenant, _status: 'published' } as any
  const doc = docs[0]
    ? await payload.update({ collection: 'pages', id: docs[0].id, data: body, context, draft: false })
    : await payload.create({ collection: 'pages', data: body, context, draft: false })
  payload.logger.info(`page /${data.slug}: ${docs[0] ? 'updated' : 'created'} (id ${doc.id})`)
  return doc.id
}

// ---- content builders ------------------------------------------------------

export const text = (title: string, body: string, tag: 'h1' | 'h2' | 'h3' = 'h2') =>
  richTextDefault([heading(title, tag), paragraph(body)])

export const paragraphs = (...lines: string[]) => richTextDefault(lines.map(paragraph))

export const pageLink = (
  page: TenantId,
  label: string,
  appearance: 'default' | 'outline' = 'default',
) => ({ link: { type: 'reference', reference: { relationTo: 'pages', value: page }, label, appearance } })

export const urlLink = (
  url: string,
  label: string,
  { appearance = 'default', newTab = false }: { appearance?: 'default' | 'outline'; newTab?: boolean } = {},
) => ({ link: { type: 'custom', url, label, appearance, newTab } })
