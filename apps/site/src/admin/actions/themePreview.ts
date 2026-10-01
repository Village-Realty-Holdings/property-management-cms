"use server"

import { requireStaff } from "../session"
import { loadPagePreview, type PreviewPage } from "../theme/previewPage"

/**
 * Theme mode: the Page the Staff User picked with Ctrl-K, as the canvas shows
 * it (its saved Blocks in its Layout), or null when it is gone. Read as the
 * Staff User; nothing is changed.
 */
export async function loadPreviewPage(id: number): Promise<PreviewPage | null> {
  const { payload, as } = await requireStaff()
  return loadPagePreview(payload, as, id)
}
