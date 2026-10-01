import type {
  CheckboxFieldValidation,
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
} from "payload"

import { layoutSummary, type LayoutState } from "./summary"

/** Set on the write that clears the previous default, so it isn't refused. */
const CLEARING_DEFAULT = "layoutsClearingDefault"

type Doc = {
  name?: string | null
  header?: unknown[] | null
  footer?: unknown[] | null
  paths?: { path?: string | null }[] | null
  isDefault?: boolean | null
}

function stateOf(doc: Doc | undefined): LayoutState {
  return {
    name: doc?.name ?? "",
    header: doc?.header ?? [],
    footer: doc?.footer ?? [],
    paths: (doc?.paths ?? []).map((row) => row?.path ?? ""),
    isDefault: Boolean(doc?.isDefault),
  }
}

/** The first Layout created is the default, whatever it asked for. */
export const firstLayoutIsDefault: CollectionBeforeValidateHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== "create" || !data || data.isDefault === true) return data
  const { totalDocs } = await req.payload.count({
    collection: "layouts",
    req,
    where: { isDefault: { equals: true } },
  })
  return totalDocs === 0 ? { ...data, isDefault: true } : data
}

/**
 * `validate` for isDefault: a Layout that is the default can't stop being it
 * by itself. There is always exactly one, so pick another Layout as the
 * default instead, which clears this one.
 */
export const validateIsDefault: CheckboxFieldValidation = async (
  value,
  { id, req }
) => {
  if (value || id === undefined || !req?.payload) return true
  if (req.context?.[CLEARING_DEFAULT]) return true
  const current = await req.payload.findByID({
    collection: "layouts",
    id,
    depth: 0,
    req,
  })
  return current.isDefault
    ? "The Site needs a default Layout. Make another Layout the default instead."
    : true
}

/** Setting a Layout as the default clears the flag on the previous one, in the same transaction. */
export const clearPreviousDefault: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  if (!doc.isDefault) return doc
  await req.payload.update({
    collection: "layouts",
    where: {
      and: [{ id: { not_equals: doc.id } }, { isDefault: { equals: true } }],
    },
    data: { isDefault: false },
    context: { [CLEARING_DEFAULT]: true },
    depth: 0,
    req,
  })
  return doc
}

/**
 * Records who saved the version and what changed. Both are always set here,
 * so nothing a client sends for them is kept.
 */
export const recordVersionDetails: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const previous = operation === "create" ? null : stateOf(originalDoc)
  const next = stateOf({ ...originalDoc, ...data })
  return {
    ...data,
    updatedBy: req.user?.collection === "users" ? req.user.id : null,
    changeSummary: layoutSummary(previous, next, {
      note: typeof data.note === "string" ? data.note : null,
    }),
    // The note is spent on this version's summary: don't carry it on.
    note: null,
  }
}
