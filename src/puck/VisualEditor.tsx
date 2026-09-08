'use client'

import { ActionBar, Puck, type Data } from '@puckeditor/core'
import { usePuckSelector as usePuck } from './usePuck'
import '@puckeditor/core/puck.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Page } from '@/payload-types'

import { layoutToPuck, puckToLayout } from './adapters'
import { BlockPickerProvider, useBlockPicker } from './pickerContext'
import { CanvasFrame } from './CanvasFrame'
import type { CanvasStyles } from './canvasStyles'
import { buildPuckConfig, viewports } from './config'
import { EditorShell, type Status } from './EditorShell'
import { RichTextSheetProvider } from './RichTextSheet'
import type { BlockSchema } from './schema'

type Props = {
  docId: number | string
  title: string
  slug: string
  initialLayout: Page['layout']
  /** Payload schema-map key of the layout field; block fields build their own keys from it. */
  layoutSchemaPath: string
  schemas: BlockSchema[]
  formHref: string
  previewHref: string | null
  canvasStyles: CanvasStyles
}

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
 * Visual editor for a page. Edits stay in the browser until the user clicks
 * "Save draft" or "Publish"; there is no autosave. A save is a PATCH through
 * the REST API as the logged-in user: `?draft=true` with `_status: 'draft'`,
 * the same request the form view makes, so collection access decides, not
 * this component. Publish saves and publishes in one PATCH. Nothing here
 * touches the public cache; the collection hooks revalidate on publish.
 * Leaving the page with unsaved edits prompts the browser's leave warning.
 */
export function VisualEditor({
  docId,
  title,
  slug,
  initialLayout,
  layoutSchemaPath,
  schemas,
  formHref,
  previewHref,
  canvasStyles,
}: Props) {
  const config = useMemo(() => buildPuckConfig(schemas, layoutSchemaPath), [schemas, layoutSchemaPath])
  const initialData = useMemo(
    () => ({ ...layoutToPuck(initialLayout), root: { props: { title, slug } } }),
    [initialLayout, title, slug],
  )
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const lastSaved = useRef(JSON.stringify(puckToDraft(initialData, schemas)))
  const pending = useRef<Draft | null>(null)

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

  /** Save whatever is pending as a draft. Returns false when the save failed. */
  const saveDraft = useCallback(async (): Promise<boolean> => {
    const draft = pending.current
    if (!draft) return true
    const json = JSON.stringify(draft)
    if (json === lastSaved.current) {
      pending.current = null
      setStatus({ kind: 'saved' })
      return true
    }
    setStatus({ kind: 'saving' })
    try {
      await patch(draft, false)
      lastSaved.current = json
      pending.current = null
      setStatus({ kind: 'saved' })
      return true
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message })
      return false
    }
  }, [patch])

  // Puck reports every edit; it is only remembered here until the user saves.
  const onChange = useCallback(
    (data: Data) => {
      let draft: Draft
      try {
        draft = puckToDraft(data, schemas)
      } catch (e) {
        pending.current = null
        setStatus({ kind: 'error', message: `${(e as Error).message}. Cannot be saved.` })
        return
      }
      if (JSON.stringify(draft) === lastSaved.current) {
        pending.current = null
        setStatus((s) => (s.kind === 'dirty' ? { kind: 'idle' } : s))
        return
      }
      pending.current = draft
      setStatus({ kind: 'dirty' })
    },
    [schemas],
  )

  // Leaving with unsaved edits asks first; nothing is saved behind the user's back.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  /** Publish saves pending edits and publishes in one request. */
  const publish = useCallback(async () => {
    const draft = pending.current ?? (JSON.parse(lastSaved.current) as Draft)
    setStatus({ kind: 'saving', message: 'Publishing' })
    try {
      await patch(draft, true)
      lastSaved.current = JSON.stringify(draft)
      pending.current = null
      setStatus({ kind: 'saved', message: 'Published' })
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message })
    }
  }, [patch])

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
      <RichTextSheetProvider>
      <BlockPickerProvider canvasStyles={canvasStyles}>
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
            onSave={saveDraft}
            previewHref={previewHref}
            schemas={schemas}
            status={status}
            title={title}
          />
        </Puck>
      </BlockPickerProvider>
      </RichTextSheetProvider>
    </div>
  )
}

/** "Insert below" on the selected block's action bar: opens the picker at the next index. */
function InsertBelowAction() {
  const selector = usePuck((s) => s.appState.ui.itemSelector)
  const { openAtRoot } = useBlockPicker()
  if (!selector || (selector.zone && selector.zone !== 'root:default-zone')) return null
  return (
    <ActionBar.Group>
      <ActionBar.Action label="Insert block below" onClick={() => openAtRoot(selector.index + 1)}>
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
