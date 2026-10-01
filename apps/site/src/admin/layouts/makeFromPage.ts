import type { Payload } from "payload"

import { makeLayoutFromPage } from "../../layouts/duplicate"
import { layoutOptionOf, type LayoutOption } from "../editor/modes/pageTabModel"
import { formStateFromError, type FormState } from "../formState"
import type { StaffAccess } from "../dashboard/queries"

/**
 * "Make a new Layout from this one", as the Page tab asks for it (spec
 * Phase 3): copies the Layout the Page uses under a new name and switches the
 * Page's Draft to the copy. Kept apart from the Server Action so it runs in
 * tests without Next.
 */

export type MakeLayoutResult = FormState & {
  /** The copy, for the canvas and the Layout list of the Page tab. */
  layout?: LayoutOption
}

export async function makeLayoutFromPageAs(
  payload: Payload,
  access: StaffAccess,
  input: { pageId: number; layoutId: number; name: string }
): Promise<MakeLayoutResult> {
  const name = typeof input.name === "string" ? input.name.trim() : ""
  if (!name) return { ok: false, message: "Give the new Layout a name." }
  if (!Number.isInteger(input.pageId) || input.pageId <= 0) {
    return {
      ok: false,
      message: "Save the Page before making a Layout from it.",
    }
  }
  if (!Number.isInteger(input.layoutId) || input.layoutId <= 0) {
    return { ok: false, message: "There is no Layout to copy." }
  }
  try {
    const copy = await makeLayoutFromPage(payload, {
      user: access.user,
      pageId: input.pageId,
      layoutId: input.layoutId,
      name,
    })
    return {
      ok: true,
      message: `Made “${copy.name}” from this Layout. The Page now uses it.`,
      layout: layoutOptionOf(copy),
    }
  } catch (error) {
    return formStateFromError(error)
  }
}
