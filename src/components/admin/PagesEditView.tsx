import type { DocumentViewServerProps } from 'payload'

import { DefaultEditView } from '@payloadcms/ui'

import { clientViewProps } from './clientViewProps'
import { VisualEditorView } from './VisualEditorView'

/**
 * Default document view for pages. A page with a title opens in the visual
 * editor. A page without one is still being set up (autosave creates the
 * draft before anything is typed), so it gets the form until the title and
 * slug exist. The form for any page stays reachable under /form.
 */
export function PagesEditView(props: DocumentViewServerProps) {
  const title = props.formState?.title?.value
  const isSetUp = Boolean(props.initPageResult.docID) && typeof title === 'string' && title.trim() !== ''
  if (!isSetUp) return <DefaultEditView {...clientViewProps(props)} />
  return <VisualEditorView {...props} />
}
