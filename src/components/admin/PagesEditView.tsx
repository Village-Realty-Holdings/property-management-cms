import type { DocumentViewServerProps } from 'payload'

import { CreatePage } from './CreatePage'
import { VisualEditorView } from './VisualEditorView'

/**
 * Default document view for pages: the visual editor.
 *
 * Autosave is on, so Payload creates an empty draft the moment /create is
 * opened and redirects to it. A page without a title is that fresh draft (or
 * an older one); it is named "New page" first, then the editor opens. Without
 * autosave there is no document yet and the same component creates one.
 *
 * The form for any page stays reachable under /form.
 */
export function PagesEditView(props: DocumentViewServerProps) {
  const { docID, req } = props.initPageResult
  const adminRoute = req.payload.config.routes.admin

  const title = props.formState?.title?.value
  const isSetUp = typeof title === 'string' && title.trim() !== ''
  if (!docID || !isSetUp) return <CreatePage adminRoute={adminRoute} docId={docID ?? undefined} />
  return <VisualEditorView {...props} />
}
