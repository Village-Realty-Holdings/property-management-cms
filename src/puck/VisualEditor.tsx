'use client'

import { ActionBar, Puck, type Data } from '@puckeditor/core'
import { usePuckSelector as usePuck } from './usePuck'
import '@puckeditor/core/puck.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Page } from '@/payload-types'

import { layoutToPuck, puckToLayout } from './adapters'
import { BlockPickerProvider, useBlockPicker } from './BlockPicker'
import { CanvasFrame } from './CanvasFrame'
import type { CanvasStyles } from './canvasStyles'
import { buildPuckConfig, viewports } from './config'
import { EditorShell, type Status } from './EditorShell'
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
export function VisualEditor({
  docId,
  title,
  slug,
  initialLayout,
  schemas,
  formHref,
  previewHref,
  canvasStyles,
}: Props) {
  const config = useMemo(() => buildPuckConfig(schemas), [schemas])
  const initialData = useMemo(
    () => ({ ...layoutToPuck(initialLayout), root: { props: { title, slug } } }),
    [initialLayout, title, slug],
  )
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const lastSaved = useRef(JSON.stringify(puckToDraft(initialData, schemas)))
  const pending = useRef<Draft | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const patch = useCallback(
    async (draft: Draft, publish: boolean) => {
      const query = publish ? 'draft=false&depth=0' : 'draft=true&depth=0'
      // An empty title or slug is not sent; the page keeps what it had rather than failing validation.
      const body: Record<string, unknown> = {
        layout: draft.layout,
        _status: publish ? 'published' : 'draft',
      }
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
      style={{
        height: 'calc(100vh - var(--visual-editor-offset, 8rem))',
        colorScheme: 'light',
        color: '#2f2f2f',
      }}
    >
      <BlockPickerProvider>
        <Puck
          config={config}
          data={initialData}
          iframe={{ syncHostStyles: false }}
          onChange={onChange}
          overrides={{
            // Puck offers every item's `id` as an editable text field; Payload
            // owns row ids, so hide it.
            fieldTypes: { text: ({ children, name }) => (name === 'id' ? null : <>{children}</>) },
            actionBar: ({ children, label, parentAction }) => (
              <ActionBar label={label}>
                {parentAction}
                <InsertBelowAction />
                {children}
              </ActionBar>
            ),
            // Public page CSS goes into the canvas only; the admin document never sees preflight.
            iframe: ({ children }) => <CanvasFrame styles={canvasStyles}>{children}</CanvasFrame>,
          }}
          ui={{
            viewports: { current: { width: '100%', height: 'auto' }, options: viewports, controlsVisible: false },
            rightSideBarVisible: true,
          }}
          viewports={viewports}
        >
          {/* Children replace Puck's stock layout, so the Blocks and Outline sidebars never mount. */}
          <EditorShell
            formHref={formHref}
            onPublish={publish}
            previewHref={previewHref}
            schemas={schemas}
            status={status}
            title={title}
          />
        </Puck>
      </BlockPickerProvider>
    </div>
  )
}

/** "Insert below" on the selected block's action bar: opens the picker at the next index. */
function InsertBelowAction() {
  const selector = usePuck((s) => s.appState.ui.itemSelector)
  const { open } = useBlockPicker()
  if (!selector || (selector.zone && selector.zone !== 'root:default-zone')) return null
  return (
    <ActionBar.Group>
      <ActionBar.Action label="Insert block below" onClick={() => open(selector.index + 1)}>
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1, fontWeight: 600 }}>
          +
        </span>
      </ActionBar.Action>
    </ActionBar.Group>
  )
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
  return res.status === 403
    ? 'You do not have permission to do that.'
    : `Save failed (${res.status})`
}
