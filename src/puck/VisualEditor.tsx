'use client'

import { Puck, type Data } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Page } from '@/payload-types'

import { layoutToPuck, puckToLayout } from './adapters'
import type { CanvasStyles } from './canvasStyles'
import { buildPuckConfig, viewports } from './config'
import type { BlockSchema } from './schema'

type Props = {
  docId: number | string
  title: string
  slug: string
  initialLayout: Page['layout']
  schemas: BlockSchema[]
  formHref: string
  previewHref: string | null
  canvasStyles: CanvasStyles
}

type Status = { kind: 'idle' | 'saving' | 'saved' | 'error'; message?: string }

const AUTOSAVE_MS = 1500

/** What one save carries: the block layout plus the page settings edited on the root. */
type Draft = { layout: Page['layout']; title: string; slug: string }

/** Puck's root props hold the page settings; the canvas is the layout. */
export function puckToDraft(data: Data, schemas: BlockSchema[]): Draft {
  const root = (data.root.props ?? {}) as { title?: unknown; slug?: unknown }
  return {
    layout: puckToLayout(data, schemas),
    title: typeof root.title === 'string' ? root.title : '',
    slug: typeof root.slug === 'string' ? root.slug : '',
  }
}

/**
 * Visual editor for a page. Every edit becomes a draft save through the REST
 * API as the logged-in user: `?draft=true` with `_status: 'draft'`, the same
 * request the edit view's autosave makes, so collection access decides, not
 * this component. Publish is the same PATCH the Publish button sends. Nothing
 * here touches the public cache; the collection hooks revalidate on publish.
 */
export function VisualEditor({ docId, title, slug, initialLayout, schemas, formHref, previewHref, canvasStyles }: Props) {
  const config = useMemo(() => buildPuckConfig(schemas), [schemas])
  const initialData = useMemo(() => ({ ...layoutToPuck(initialLayout), root: { props: { title, slug } } }), [initialLayout, title, slug])
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const lastSaved = useRef(JSON.stringify(puckToDraft(initialData, schemas)))
  const pending = useRef<Draft | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const patch = useCallback(
    async (draft: Draft, publish: boolean) => {
      const query = publish ? 'draft=false&depth=0' : 'draft=true&depth=0'
      // An empty title or slug is not sent; the page keeps what it had rather than failing validation.
      const body: Record<string, unknown> = { layout: draft.layout, _status: publish ? 'published' : 'draft' }
      if (draft.title.trim()) body.title = draft.title.trim()
      if (draft.slug.trim()) body.slug = draft.slug.trim()
      const res = await fetch(`/api/pages/${docId}?${query}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await describeError(res))
    },
    [docId],
  )

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const draft = pending.current
    pending.current = null
    if (!draft) return
    const json = JSON.stringify(draft)
    if (json === lastSaved.current) return
    setStatus({ kind: 'saving' })
    try {
      await patch(draft, false)
      lastSaved.current = json
      setStatus({ kind: 'saved' })
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message })
    }
  }, [patch])

  const onChange = useCallback(
    (data: Data) => {
      let draft: Draft
      try {
        draft = puckToDraft(data, schemas)
      } catch (e) {
        pending.current = null
        setStatus({ kind: 'error', message: `${(e as Error).message}. Not saved.` })
        return
      }
      pending.current = draft
      setStatus((s) => (s.kind === 'error' ? { kind: 'idle' } : s))
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS)
    },
    [flush, schemas],
  )

  // Save what is still pending when the editor is left.
  useEffect(() => {
    const onHide = () => {
      if (pending.current) void flush()
    }
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      onHide()
    }
  }, [flush])

  const publish = useCallback(async () => {
    await flush()
    const draft = JSON.parse(lastSaved.current) as Draft
    setStatus({ kind: 'saving', message: 'Publishing' })
    try {
      await patch(draft, true)
      setStatus({ kind: 'saved', message: 'Published' })
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message })
    }
  }, [flush, patch])

  return (
    <div
      className="visual-editor"
      // Puck's chrome is light-only; opt out of the admin's dark theme so its
      // inherited white text does not land on Puck's white panels.
      style={{ height: 'calc(100vh - var(--visual-editor-offset, 8rem))', colorScheme: 'light', color: '#2f2f2f' }}
    >
      <Puck
        config={config}
        data={initialData}
        headerPath="/"
        headerTitle={title}
        iframe={{ syncHostStyles: false }}
        onChange={onChange}
        overrides={{
          // Puck offers every item's `id` as an editable text field; Payload
          // owns row ids, so hide it.
          fieldTypes: { text: ({ children, name }) => (name === 'id' ? null : <>{children}</>) },
          headerActions: () => <HeaderActions formHref={formHref} onPublish={publish} previewHref={previewHref} status={status} />,
          // Public page CSS goes into the canvas only; the admin document never sees preflight.
          iframe: ({ children }) => <CanvasFrame styles={canvasStyles}>{children}</CanvasFrame>,
        }}
        viewports={viewports}
      />
    </div>
  )
}

/**
 * Root of the canvas iframe: the public page's stylesheets, and its <html>
 * class (next/font variables) on the iframe's own <html> so font tokens
 * resolve the same way they do on the site.
 */
function CanvasFrame({ styles, children }: { styles: CanvasStyles; children: React.ReactNode }) {
  const marker = useRef<HTMLMetaElement>(null)
  useEffect(() => {
    const html = marker.current?.ownerDocument.documentElement
    if (!html) return
    const classes = styles.htmlClass.split(/\s+/).filter(Boolean)
    html.classList.add(...classes)
    return () => html.classList.remove(...classes)
  }, [styles.htmlClass])
  return (
    <>
      <meta name="canvas-root" ref={marker} />
      {styles.links.map((href) => (
        <link href={href} key={href} rel="stylesheet" />
      ))}
      {styles.inline.map((css, i) => (
        <style dangerouslySetInnerHTML={{ __html: css }} key={i} />
      ))}
      {children}
    </>
  )
}

function HeaderActions({
  status,
  onPublish,
  formHref,
  previewHref,
}: {
  status: Status
  onPublish: () => void
  formHref: string
  previewHref: string | null
}) {
  const label =
    status.kind === 'saving'
      ? `${status.message ?? 'Saving'}…`
      : status.kind === 'saved'
        ? (status.message ?? 'Draft saved')
        : status.kind === 'error'
          ? status.message
          : 'Edits autosave as a draft'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
      <span style={{ color: status.kind === 'error' ? '#b00020' : 'inherit', maxWidth: 360 }}>{label}</span>
      <a href={formHref} style={linkStyle}>
        Form view
      </a>
      {previewHref && (
        <a href={previewHref} rel="noreferrer" style={linkStyle} target="_blank">
          Preview draft
        </a>
      )}
      <button disabled={status.kind === 'saving'} onClick={onPublish} style={publishStyle} type="button">
        Publish
      </button>
    </div>
  )
}

const linkStyle: React.CSSProperties = { textDecoration: 'underline', color: 'inherit' }
const publishStyle: React.CSSProperties = {
  background: '#1f6a78',
  color: '#fff',
  border: 0,
  borderRadius: 4,
  padding: '6px 14px',
  fontWeight: 600,
  cursor: 'pointer',
}

async function describeError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as {
      errors?: { message?: string; data?: { errors?: { message?: string; path?: string }[] } }[]
    }
    const first = json.errors?.[0]
    const field = first?.data?.errors?.[0]
    if (field?.message) return field.path ? `${field.path}: ${field.message}` : field.message
    if (first?.message) return first.message
  } catch {
    /* not JSON */
  }
  return res.status === 403 ? 'You do not have permission to do that.' : `Save failed (${res.status})`
}
