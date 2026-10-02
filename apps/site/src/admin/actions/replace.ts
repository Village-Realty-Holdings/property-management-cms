"use server"

import { revalidatePath } from "next/cache"

import { loadMediaReplacement } from "../replace/image"
import {
  applyReplace,
  previewReplace,
  type ReplaceMode,
  type ReplacePreview,
  type ReplaceResult,
} from "../replace/run"
import { parseTextQuery, textReplacement } from "../replace/text"
import { requireStaff } from "../session"

/**
 * The Tools' site-wide replaces (apps/site ADR-0008). Each runs as the Staff
 * User (ADR-0002) and checks what the browser sent again. Applying reads the
 * Site afresh: it never takes a preview's word for what matches.
 */

export type PreviewResult =
  | { ok: true; preview: ReplacePreview }
  | { ok: false; message: string }

/** The screens' "Include Page Templates" switch: off unless it says on. */
const includesTemplates = (input: unknown) =>
  (input as { includeTemplates?: unknown } | null)?.includeTemplates === true

const refused = (message: string): ReplaceResult => ({
  ok: false,
  message,
  outcomes: [],
})

/** A replace can change any Page, Layout or setting, in the Admin and on the Site. */
function revalidateAfterReplace() {
  revalidatePath("/admin", "layout")
  revalidatePath("/", "layout")
}

export async function previewTextReplace(
  input: unknown
): Promise<PreviewResult> {
  const { payload, as } = await requireStaff()
  const parsed = parseTextQuery(input)
  if (!parsed.ok) return parsed
  return {
    ok: true,
    preview: await previewReplace(
      payload,
      as,
      textReplacement(parsed.query, { templates: includesTemplates(input) })
    ),
  }
}

export async function applyTextReplace(
  input: unknown,
  mode: ReplaceMode
): Promise<ReplaceResult> {
  const { payload, as } = await requireStaff()
  const parsed = parseTextQuery(input)
  if (!parsed.ok) return refused(parsed.message)
  const result = await applyReplace(
    payload,
    as,
    textReplacement(parsed.query, { templates: includesTemplates(input) }),
    mode
  )
  if (result.outcomes.length > 0) revalidateAfterReplace()
  return result
}

export async function previewImageReplace(
  input: unknown
): Promise<PreviewResult> {
  const { payload, as } = await requireStaff()
  const loaded = await loadMediaReplacement(payload, as, input)
  if (!loaded.ok) return loaded
  return {
    ok: true,
    preview: await previewReplace(payload, as, loaded.replacement),
  }
}

export async function applyImageReplace(
  input: unknown,
  mode: ReplaceMode
): Promise<ReplaceResult> {
  const { payload, as } = await requireStaff()
  const loaded = await loadMediaReplacement(payload, as, input)
  if (!loaded.ok) return refused(loaded.message)
  const result = await applyReplace(payload, as, loaded.replacement, mode)
  if (result.outcomes.length > 0) revalidateAfterReplace()
  return result
}
