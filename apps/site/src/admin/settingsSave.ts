import type { Payload } from "payload"

import type { User } from "../payload-types"
import {
  brandToValues,
  brandValuesToData,
  parseBrandValues,
  type BrandValues,
} from "./brandForm"
import { formStateFromError, type FormState } from "./formState"
import { globalRevision, staleSaveRefusal } from "./revision"
import {
  parseSeoValues,
  seoToValues,
  seoValuesToData,
  type SeoValues,
} from "./seoForm"
import type { RevisionResult, SaveGuard } from "./staleSave"

/**
 * Reading and saving the Brand and SEO globals for their Admin screens,
 * through the Local API with the caller's access (apps/site ADR-0002): the
 * Server Actions pass the User's `as`. Kept apart from the actions so
 * it runs in tests without Next.
 */

/** The Local API access options of the caller (see UserContext). */
export type Access = {
  overrideAccess: false
  user: (User & { collection: "users" }) | null
}

/** What a save returns to its form: the state, plus the values as stored. */
export type SaveResult<V> = FormState & { values?: V } & RevisionResult

export async function loadBrand(
  payload: Payload,
  access: Access
): Promise<BrandValues> {
  return brandToValues(
    await payload.findGlobal({ slug: "brand", depth: 0, ...access })
  )
}

export async function loadSeo(
  payload: Payload,
  access: Access
): Promise<SeoValues> {
  return seoToValues(
    await payload.findGlobal({ slug: "seo", depth: 0, ...access })
  )
}

export async function saveBrandAs(
  payload: Payload,
  access: Access,
  input: unknown,
  guard: SaveGuard = {}
): Promise<SaveResult<BrandValues>> {
  const parsed = parseBrandValues(input)
  if (!parsed.ok) return invalid(parsed)
  try {
    const stale = await staleSaveRefusal(
      payload,
      access,
      { kind: "brand" },
      guard
    )
    if (stale) return stale
    const saved = await payload.updateGlobal({
      slug: "brand",
      data: brandValuesToData(parsed.values),
      depth: 0,
      ...access,
    })
    return {
      ok: true,
      message: "Brand saved.",
      values: brandToValues(saved),
      revision: globalRevision(saved),
    }
  } catch (error) {
    return formStateFromError(error)
  }
}

export async function saveSeoAs(
  payload: Payload,
  access: Access,
  input: unknown,
  guard: SaveGuard = {}
): Promise<SaveResult<SeoValues>> {
  const parsed = parseSeoValues(input)
  if (!parsed.ok) return invalid(parsed)
  try {
    const stale = await staleSaveRefusal(
      payload,
      access,
      { kind: "seo" },
      guard
    )
    if (stale) return stale
    const saved = await payload.updateGlobal({
      slug: "seo",
      data: seoValuesToData(parsed.values),
      depth: 0,
      ...access,
    })
    return {
      ok: true,
      message: "SEO saved.",
      values: seoToValues(saved),
      revision: globalRevision(saved),
    }
  } catch (error) {
    return formStateFromError(error)
  }
}

function invalid(parsed: {
  fieldErrors: Record<string, string>
  message?: string
}): FormState {
  return {
    ok: false,
    message: parsed.message ?? "Some fields need attention.",
    fieldErrors: parsed.fieldErrors,
  }
}
