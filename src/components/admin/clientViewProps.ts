import type { DocumentViewClientProps, DocumentViewServerProps } from 'payload'

/**
 * The subset of a document view's props that Payload hands to its client-side
 * edit view. Server-only props (req, payload, i18n…) cannot cross into a
 * client component, so pick the client ones explicitly.
 */
export function clientViewProps(props: DocumentViewServerProps): DocumentViewClientProps {
  const {
    BeforeDocumentControls,
    Description,
    documentSubViewType,
    EditMenuItems,
    formState,
    LivePreview,
    PreviewButton,
    PublishButton,
    SaveButton,
    SaveDraftButton,
    Status,
    UnpublishButton,
    Upload,
    UploadControls,
    viewType,
  } = props
  return {
    BeforeDocumentControls,
    Description,
    documentSubViewType,
    EditMenuItems,
    formState,
    LivePreview,
    PreviewButton,
    PublishButton,
    SaveButton,
    SaveDraftButton,
    Status,
    UnpublishButton,
    Upload,
    UploadControls,
    viewType,
  }
}
