'use client'

import { Drawer, Form, useDocumentInfo, useDrawerSlug, useFormFields, useModal, useServerFunctions } from '@payloadcms/ui'
import type { FormState } from 'payload'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { type RichTextRequest, RichTextSheetContext, type SheetApi } from './richTextContext'

/**
 * A rich text field in the sidebar opens a sheet with Payload's own Lexical
 * editor for that field, with the same features the form view configures
 * (heading levels, toolbars, links). The editor is server-built: the sheet
 * asks Payload's form-state server function to render the field for the
 * block's schema path, mounts the returned element inside a small Payload
 * form, and hands the edited value back to Puck on Done. Cancel discards.
 *
 * The visual editor is a Payload document view, so the document, server
 * function and modal providers this needs are already above it. Without a
 * provider (unit tests) `available` is false and the field says so.
 */
export { richTextExcerpt, useRichTextSheet } from './richTextContext'

type Loaded = { request: RichTextRequest; state: FormState | null; error: string | null }

export function RichTextSheetProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [loading, setLoading] = useState(false)
  const slug = useDrawerSlug('visual-editor-richtext')
  const { openModal, closeModal } = useModal()
  const { getFormState } = useServerFunctions()
  const { id, collectionSlug, docPermissions, getDocPreferences } = useDocumentInfo()

  const open = useCallback(
    async (request: RichTextRequest) => {
      setLoading(true)
      setLoaded({ request, state: null, error: null })
      openModal(slug)
      try {
        const docPreferences = await getDocPreferences()
        const { state } = await getFormState({
          collectionSlug: collectionSlug ?? 'pages',
          id,
          operation: 'update',
          schemaPath: request.schemaPath,
          data: { [request.name]: request.value },
          renderAllFields: true,
          docPermissions,
          docPreferences,
          skipValidation: true,
        })
        const field = state?.[request.name]?.customComponents?.Field
        setLoaded({
          request,
          state: field ? state : null,
          error: field ? null : `Payload did not return an editor for "${request.schemaPath}.${request.name}".`,
        })
      } catch (e) {
        setLoaded({ request, state: null, error: (e as Error).message })
      } finally {
        setLoading(false)
      }
    },
    [collectionSlug, docPermissions, getDocPreferences, getFormState, id, openModal, slug],
  )

  const close = useCallback(() => {
    closeModal(slug)
    setLoaded(null)
  }, [closeModal, slug])

  const api = useMemo<SheetApi>(() => ({ available: true, open: (r) => void open(r) }), [open])

  return (
    <RichTextSheetContext.Provider value={api}>
      {children}
      <Drawer slug={slug} title={loaded ? `Edit ${loaded.request.label}` : 'Edit text'}>
        {loaded && (
          <Sheet key={loaded.request.schemaPath + loaded.request.name} loaded={loaded} loading={loading} onClose={close} />
        )}
      </Drawer>
    </RichTextSheetContext.Provider>
  )
}

function Sheet({ loaded, loading, onClose }: { loaded: Loaded; loading: boolean; onClose: () => void }) {
  const { request, state, error } = loaded
  const latest = useRef<unknown>(request.value)
  const remember = useCallback((value: unknown) => {
    latest.current = value
  }, [])

  if (loading) return <p style={note}>Loading the editor…</p>
  if (!state) return <p style={{ ...note, color: '#b00020' }}>{error ?? 'The editor could not be loaded.'}</p>

  return (
    <Form disableValidationOnSubmit el="div" initialState={state}>
      {state[request.name]?.customComponents?.Field}
      <ValueBridge name={request.name} onValue={remember} />
      <div style={footer}>
        <button className="btn btn--style-secondary btn--size-medium" onClick={onClose} type="button">
          Cancel
        </button>
        <button
          className="btn btn--style-primary btn--size-medium"
          onClick={() => {
            request.onChange(latest.current)
            onClose()
          }}
          type="button"
        >
          Done
        </button>
      </div>
    </Form>
  )
}

/** Reports the form's value for the field so the footer can hand it back on Done. */
function ValueBridge({ name, onValue }: { name: string; onValue: (value: unknown) => void }) {
  const value = useFormFields(([fields]) => fields?.[name]?.value)
  useEffect(() => {
    if (value !== undefined) onValue(value)
  }, [value, onValue])
  return null
}

const note: React.CSSProperties = { padding: 'var(--base)', fontSize: 14 }
const footer: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 'var(--base)',
  paddingTop: 'var(--base)',
  borderTop: '1px solid var(--theme-elevation-100)',
}
