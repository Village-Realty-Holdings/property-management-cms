"use server"

import { revalidatePath } from "next/cache"
import { NotFound } from "payload"

import { formStateFromError, type FormState } from "../formState"
import { requireStaff } from "../session"

/** Uploads an image to Media with its alt text. */
export async function uploadMedia(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const { payload, as } = await requireStaff()
  const file = formData.get("file")
  const alt = String(formData.get("alt") ?? "").trim()
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, fieldErrors: { file: "Choose an image to upload." } }
  }
  try {
    await payload.create({
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
  } catch (error) {
    return formStateFromError(error)
  }
  revalidatePath("/admin/media")
  return { ok: true, message: `Uploaded ${file.name}.` }
}

/**
 * Deletes one image. The Media screen asks first (<MediaDeleteButton>); the
 * result is shown in its dialog.
 */
export async function deleteMedia(id: number): Promise<FormState> {
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "That image no longer exists." }
  }
  const { payload, as } = await requireStaff()
  try {
    const media = await payload.findByID({
      collection: "media",
      id,
      depth: 0,
      ...as,
    })
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
