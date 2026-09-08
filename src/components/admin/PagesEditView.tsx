import type { DocumentViewServerProps } from 'payload'

import { DefaultEditView } from '@payloadcms/ui'

import { clientViewProps } from './clientViewProps'
import { CreatePage } from './CreatePage'
import { VisualEditorView } from './VisualEditorView'

/**
 * Default document view for pages.
 *
 * - /create: no document yet. A draft is created immediately and the visual
 *   editor opens for it, so a new page never starts in the form.
 * - A saved page with a title opens in the visual editor.
 * - A saved page without a title (an old draft from before pages were
 *   created this way) gets the form until it has one.
 *
 * The form for any page stays reachable under /form.
 */
export function PagesEditView(props: DocumentViewServerProps) {
  const { docID, req } = props.initPageResult
  if (!docID) return <CreatePage adminRoute={req.payload.config.routes.admin} />

  const title = props.formState?.title?.value
  const isSetUp = typeof title === 'string' && title.trim() !== ''
  if (!isSetUp) return <DefaultEditView {...clientViewProps(props)} />
  return <VisualEditorView {...props} />
}
