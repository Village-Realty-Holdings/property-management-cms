"use server"

import { formStateFromError, type FormState } from "../formState"
import { requireStaff } from "../session"
import type { SiteSetting } from "../../payload-types"

export type SettingsValues = Pick<
  SiteSetting,
  "name" | "tagline" | "domain" | "contact" | "branding" | "social"
>

/** Saves Site Settings from the Admin's form. */
export async function saveSettings(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const { payload, as } = await requireStaff()
  const values = JSON.parse(
    String(formData.get("values") ?? "{}")
  ) as SettingsValues
  try {
    await payload.updateGlobal({ slug: "site-settings", data: values, ...as })
  } catch (error) {
    return formStateFromError(error)
  }
  return { ok: true, message: "Site Settings saved. The Site shows them now." }
}
