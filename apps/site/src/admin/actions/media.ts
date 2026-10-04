"use server"

import { revalidatePath } from "next/cache"
import { NotFound } from "payload"

import type { MediaOption } from "../components/MediaSelect"
import { formStateFromError, type FormState } from "../formState"
import { toMediaOption, updateMediaAs } from "../media"
import { requireUser } from "../session"
import { loadMediaDependents, mediaInUseMessage } from "../usage"

/** An upload's result: on success, the new image as a picker option. */
export type UploadState = FormState & { media?: MediaOption }

/** Uploads an image to Media with its alt text. */
export async function uploadMedia(
  _previous: FormState,
  formData: FormData
): Promise<UploadState> {
  const { payload, as } = await requireUser()
  const file = formData.get("file")
  const alt = String(formData.get("alt") ?? "").trim()
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, fieldErrors: { file: "Choose an image to upload." } }
  }
  let media: MediaOption
  try {
    const doc = await payload.create({
      collection: "media",
      data: { alt },
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
      ...as,
    })
    media = toMediaOption(doc)
  } catch (error) {
    return formStateFromError(error)
  }
  revalidatePath("/admin/media")
  return { ok: true, message: `Uploaded ${file.name}.`, media }
}

/**
 * Saves an image's alt text, caption, credit and attribution. The form
 * (<MediaEditSheet>) sends `alt`, `caption`, `credit`, `author`, `sourceUrl`
 * and `licence`.
 */
export async function updateMedia(
  id: number,
  data: FormData
): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await updateMediaAs(payload, as, id, data)
  if (result.ok) {
    revalidatePath("/admin/media")
    // Alt text and captions show on the Site.
    revalidatePath("/", "layout")
  }
  return result
}

/**
 * Deletes one image. Refused, with the reason, while the Brand, SEO or any
 * Block of a Page (Draft or Published) or a Layout shows it: the dialog
 * (<MediaDeleteButton>) says so up front, and this checks again, because the
 * dialog's list can be out of date or the call can come from anywhere.
 */
export async function deleteMedia(id: number): Promise<FormState> {
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "That image no longer exists." }
  }
  const { payload, as } = await requireUser()
  try {
    const media = await payload.findByID({
      collection: "media",
      id,
      depth: 0,
      ...as,
    })
    const uses = (await loadMediaDependents(payload, as)).get(id) ?? []
    if (uses.length > 0) {
      return {
        ok: false,
        message: mediaInUseMessage(media.filename ?? "The image", uses),
      }
    }
    await payload.delete({ collection: "media", id, ...as })
    revalidatePath("/admin/media")
    return { ok: true, message: `Deleted ${media.filename ?? "the image"}.` }
  } catch (error) {
    if (error instanceof NotFound) {
      return { ok: false, message: "That image no longer exists." }
    }
    return formStateFromError(error)
  }
}
