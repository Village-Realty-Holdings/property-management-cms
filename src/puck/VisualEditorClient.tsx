'use client'

import dynamic from 'next/dynamic'

// Puck and the rich-text drawer consume Payload's browser provider tree.
// Mount them on the client instead of prerendering the editor on the server.
export const VisualEditorClient = dynamic(
  () => import('./VisualEditor').then((module) => module.VisualEditor),
  { ssr: false, loading: () => <p role="status">Loading editor…</p> },
)
