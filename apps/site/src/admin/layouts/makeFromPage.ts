import type { Payload } from "payload"

import { makeLayoutFromPage } from "../../layouts/duplicate"
import { layoutOptionOf, type LayoutOption } from "../editor/modes/pageTabModel"
import { formStateFromError, type FormState } from "../formState"
import type { UserAccess } from "../dashboard/queries"
import { readRevision, staleSaveRefusal } from "../revision"
import type { RevisionResult, SaveGuard } from "../staleSave"

/**
 * "Make a new Layout from this one", as the Page tab asks for it (spec
 * Phase 3): copies the Layout the Page uses under a new name and switches the
 * Page's Draft to the copy. Kept apart from the Server Action so it runs in
 * tests without Next.
 */

export type MakeLayoutResult = FormState &
  RevisionResult & {
    /** The copy, for the canvas and the Layout list of the Page tab. */
    layout?: LayoutOption
  }

export async function makeLayoutFromPageAs(
  payload: Payload,
  access: UserAccess,
  input: { pageId: number; layoutId: number; name: string } & SaveGuard
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
    // It changes the Page's Draft, so the Page's revision is the one checked.
    const stale = await staleSaveRefusal(
      payload,
      access,
      { kind: "page", id: input.pageId },
      input
    )
    if (stale) return stale
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
      revision: (
        await readRevision(payload, access, {
          kind: "page",
          id: input.pageId,
        })
      ).revision,
    }
  } catch (error) {
    return formStateFromError(error)
  }
}
