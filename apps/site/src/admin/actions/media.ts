"use server"

import { revalidatePath } from "next/cache"

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

export async function deleteMedia(formData: FormData): Promise<void> {
  const { payload, as } = await requireStaff()
  const id = Number(formData.get("id"))
  if (id) await payload.delete({ collection: "media", id, ...as })
  revalidatePath("/admin/media")
}
