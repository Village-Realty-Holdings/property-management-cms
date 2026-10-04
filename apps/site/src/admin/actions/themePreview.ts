"use server"

import { requireUser } from "../session"
import { loadPagePreview, type PreviewPage } from "../theme/previewPage"

/**
 * Theme mode: the Page the User picked with Ctrl-K, as the canvas shows
 * it (its saved Blocks in its Layout), or null when it is gone. Read as the
 * User; nothing is changed.
 */
export async function loadPreviewPage(id: number): Promise<PreviewPage | null> {
  const { payload, as } = await requireUser()
  return loadPagePreview(payload, as, id)
}
