import type { DocumentViewServerProps } from 'payload'

import { DefaultEditView } from '@payloadcms/ui'

import { clientViewProps } from './clientViewProps'

/**
 * Payload's own edit form, mounted at /admin/collections/pages/:id/form so it
 * stays reachable now that the visual editor owns the document's base route.
 */
export function FormView(props: DocumentViewServerProps) {
  return <DefaultEditView {...clientViewProps(props)} />
}
