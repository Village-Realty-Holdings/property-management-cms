import { getSchemaMap } from '@payloadcms/ui/utilities/getSchemaMap'
import type { DocumentViewServerProps } from 'payload'

import type { Page } from '@/payload-types'
import { fetchCanvasStyles } from '@/puck/canvasStyles'
import { blocksToSchema, findBlocksField } from '@/puck/schema'
import { VisualEditorClient } from '@/puck/VisualEditorClient'
import { generatePreviewPath } from '@/seo/generatePreviewPath'

/**
 * The document view at /admin/collections/pages/:id.
 * Loads the latest draft as the logged-in user (access rules apply, no
 * override), derives the block schema from the live Pages config, and fetches
 * the public page's stylesheets for the canvas.
 */
export async function VisualEditorView({ initPageResult }: DocumentViewServerProps) {
  const { req, docID } = initPageResult
  const { config } = req.payload
  if (!docID) {
    return <p style={{ padding: 'var(--base)' }}>Save the page once, then reopen it to use the visual editor.</p>
  }

  const pages = config.collections.find((c) => c.slug === 'pages')
  const blocks = pages ? findBlocksField(pages.fields, 'layout', config.blocks) : null
  if (!blocks) {
    return <p style={{ padding: 'var(--base)' }}>The pages collection has no layout blocks field.</p>
  }

  // Payload's schema-map key for the layout field (tabs add `_index-N`
  // segments, so it is looked up rather than spelled out). Sidebar fields
  // append `.<blockSlug>` and deeper names to address their own fields when
  // asking the server to render a rich text editor.
  const schemaMap = getSchemaMap({ collectionSlug: 'pages', config, i18n: req.i18n })
  const layoutSchemaPath =
    [...schemaMap.entries()].find(([key, entry]) => key.endsWith('.layout') && 'type' in entry && entry.type === 'blocks')?.[0] ??
    'pages.layout'

  const page = (await req.payload.findByID({
    collection: 'pages',
    id: docID,
    draft: true,
    depth: 1,
    user: req.user,
    overrideAccess: false,
  })) as Page

  // The canvas is styled like the site the admin is being served from, so the
  // tenant resolved by hostname is the one whose theme the editor shows.
  const origin = originOf(req)
  const pagePath = page.slug === 'home' ? '/' : `/${page.slug ?? ''}`
  const canvasStyles = await fetchCanvasStyles(origin, [pagePath, '/'], { host: req.headers.get('host') ?? '' })

  return (
    <VisualEditorClient
      canvasStyles={canvasStyles}
      docId={page.id}
      formHref={`${config.routes.admin}/collections/pages/${page.id}/form`}
      initialLayout={page.layout}
      layoutSchemaPath={layoutSchemaPath}
      previewHref={generatePreviewPath({ collection: 'pages', slug: page.slug ?? '', req, data: page })}
      schemas={blocksToSchema(blocks, config.blocks)}
      slug={page.slug ?? ''}
      title={page.title}
    />
  )
}

function originOf(req: DocumentViewServerProps['initPageResult']['req']): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (!host) return process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
  return `${proto}://${host}`
}
