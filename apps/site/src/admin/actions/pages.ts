"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { formStateFromError, type FormState } from "../formState"
import { valuesToPageData, type PageValues } from "../pageForm"
import { fromMarkdown } from "../richText"
import { requireStaff } from "../session"

export type PageIntent = "draft" | "publish" | "unpublish"

const messages: Record<PageIntent, string> = {
  draft: "Draft saved.",
  publish: "Published. The Page is live on the Site.",
  unpublish: "Unpublished. Visitors no longer see this Page.",
}

/**
 * Saves a Page from the Admin's form: as a Draft, published, or taken off
 * the Site. `id` is empty for a new Page, which redirects to its edit view.
 */
export async function savePage(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const { payload, as } = await requireStaff()
  const id = Number(formData.get("id")) || null
  const intent = (formData.get("intent") as PageIntent) || "draft"
  const values = JSON.parse(
    String(formData.get("values") ?? "{}")
  ) as PageValues

  let savedId: number
  try {
    const data = await valuesToPageData(values, (markdown) =>
      fromMarkdown(payload, markdown)
    )
    const status = intent === "publish" ? "published" : "draft"
    // A Draft save keeps the Published version as it is; publishing and
    // unpublishing change what visitors see.
    const draft = intent === "draft"
    const saved = id
      ? await payload.update({
          collection: "pages",
          id,
          data: { ...data, _status: status },
          draft,
          ...as,
        })
      : await payload.create({
          collection: "pages",
          data: { ...data, _status: status },
          draft,
          ...as,
        })
    savedId = saved.id
  } catch (error) {
    return formStateFromError(error)
  }

  if (!id) redirect(`/admin/pages/${savedId}?saved=${intent}`)
  // Refreshes the status badge; the form keeps what was typed.
  revalidatePath(`/admin/pages/${savedId}`)
  return { ok: true, message: messages[intent] }
}

export async function deletePage(formData: FormData): Promise<void> {
  const { payload, as } = await requireStaff()
  const id = Number(formData.get("id"))
  if (id) await payload.delete({ collection: "pages", id, ...as })
  redirect("/admin/pages")
}
