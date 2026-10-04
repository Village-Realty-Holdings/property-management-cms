"use server"

import { revalidatePath } from "next/cache"
import { NotFound } from "payload"

import { formStateFromError, type FormState } from "@/admin/formState"
import { requireUser } from "@/admin/session"
import { duplicateLayout as duplicateLayoutAs } from "@/layouts/duplicate"

const gone = (): FormState => ({
  ok: false,
  message: "That Layout no longer exists.",
})

/** What the lists show changes with a Layout: it also changes Pages' Layout column. */
function revalidateLayoutScreens() {
  revalidatePath("/admin/layouts")
  revalidatePath("/admin/pages")
  revalidatePath("/admin")
}

/**
 * Duplicates a Layout under a new name ("Main (copy)"), as the User.
 * The copy has the same Header and Footer, no paths, and is never the
 * default. The list shows the toast from the message.
 */
export async function duplicateLayout(id: number): Promise<FormState> {
  const { payload, user } = await requireUser()
  if (!Number.isInteger(id) || id <= 0) return gone()
  try {
    const copy = await duplicateLayoutAs(payload, { user, id })
    revalidateLayoutScreens()
    return { ok: true, message: `Duplicated as “${copy.name}”.` }
  } catch (error) {
    if (error instanceof NotFound) return gone()
    return formStateFromError(error)
  }
}

/**
 * Deletes a Layout. The list asks first (<LayoutRowActions>). The collection
 * refuses the default Layout and one that Pages pick, and its message says
 * why; it is passed on as the failure.
 */
export async function deleteLayout(id: number): Promise<FormState> {
  const { payload, as } = await requireUser()
  if (!Number.isInteger(id) || id <= 0) return gone()
  try {
    const layout = await payload.findByID({
      collection: "layouts",
      id,
      depth: 0,
      select: { name: true },
      ...as,
    })
    await payload.delete({ collection: "layouts", id, ...as })
    revalidateLayoutScreens()
    // Pages that used it by path now use another Layout.
    revalidatePath("/", "layout")
    return { ok: true, message: `Deleted Layout “${layout.name}”.` }
  } catch (error) {
    if (error instanceof NotFound) return gone()
    return formStateFromError(error)
  }
}
