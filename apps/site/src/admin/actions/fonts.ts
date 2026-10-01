"use server"

import { revalidatePath } from "next/cache"

import type { FormState } from "../formState"
import {
  addGoogleFontAs,
  deleteFontAs,
  uploadFontAs,
} from "../fonts/fontsScreen"
import { requireStaff } from "../session"

/**
 * The Fonts screen's Server Actions. Each runs as the Staff User (apps/site
 * ADR-0002) and validates what the browser sent again. After a change the
 * Fonts screen and the Site are refreshed: the Site's layout inlines the
 * `@font-face` rules for the stored Fonts.
 */

const SCREEN = "/admin/settings/assets/fonts"

function refresh() {
  revalidatePath(SCREEN)
  revalidatePath("/", "layout")
}

/** Add Google Font: downloads the files, stores them, the Site serves them. */
export async function addGoogleFont(
  _previous: FormState,
  data: FormData
): Promise<FormState> {
  const { payload, as } = await requireStaff()
  const result = await addGoogleFontAs(payload, as, data)
  if (result.ok) refresh()
  return result
}

/** Upload files: a Font from font files, each with its weight and style. */
export async function uploadFonts(
  _previous: FormState,
  data: FormData
): Promise<FormState> {
  const { payload, as } = await requireStaff()
  const result = await uploadFontAs(payload, as, data)
  if (result.ok) refresh()
  return result
}

/**
 * Deletes a Font. Refused, with the reason, while the Theme or anything else
 * uses it.
 */
export async function deleteFont(id: number): Promise<FormState> {
  const { payload, as } = await requireStaff()
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "That Font no longer exists." }
  }
  const result = await deleteFontAs(payload, as, id)
  if (result.ok) refresh()
  return result
}
