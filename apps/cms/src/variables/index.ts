import type {
  CollectionBeforeChangeHook,
  PayloadRequest,
  UIField,
} from "payload"
import { ValidationError } from "payload"

import {
  collectVariableIssues,
  variableValuesFrom,
  type FieldVariableIssue,
  type VariableValues,
} from "@workspace/content/shared"

/**
 * Variables in the CMS (ADR-0017). Content keeps `{name}` as typed; apps/site
 * replaces it. Here: the Site's current values, save validation for Pages
 * and Guides, and the editor's help panel. Names and the scanner come from
 * `@workspace/content/shared`, so both apps agree.
 */

type ID = number | string

const idOf = (ref: unknown): ID | undefined =>
  ref && typeof ref === "object"
    ? (ref as { id?: ID }).id
    : ((ref as ID | null | undefined) ?? undefined)

/** A Site's Variables (built-ins and Custom Variables), or null when it's unknown. */
export async function siteVariables(
  req: PayloadRequest,
  siteRef: unknown
): Promise<VariableValues | null> {
  const id = idOf(siteRef)
  if (id === undefined) return null
  const site = await req.payload.findByID({
    collection: "sites",
    id,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
    req,
  })
  return site ? variableValuesFrom(site) : null
}

/** Document fields that are never copy: not scanned. */
const skipped = new Set(["id", "site", "_status", "createdAt", "updatedAt"])

export type VariableCheck = {
  /** Unknown Variables: publishing is blocked. */
  errors: FieldVariableIssue[]
  /** Empty Variables and literal braces: saved, shown to the editor. */
  warnings: FieldVariableIssue[]
}

/** The Variable problems in a Page or Guide's data, split by severity. */
export function checkVariables(
  data: Record<string, unknown>,
  values: VariableValues
): VariableCheck {
  const copy = Object.fromEntries(
    Object.entries(data).filter(([key]) => !skipped.has(key))
  )
  const issues = collectVariableIssues(copy, values)
  return {
    errors: issues.filter((issue) => issue.kind === "unknown"),
    warnings: issues.filter((issue) => issue.kind !== "unknown"),
  }
}

export function issueMessage(issue: FieldVariableIssue): string {
  switch (issue.kind) {
    case "unknown":
      return `{${issue.name}} is not a Variable of this Site. Check the spelling, or add it as a Custom Variable in Site Settings.`
    case "empty":
      return `{${issue.name}} has no value in Site Settings, so it shows as empty.`
    case "literalBraces":
      return `"${issue.text}" has braces that aren't a Variable. A Variable must be typed in one go, in one style.`
  }
}

/**
 * `beforeChange` on Pages and Guides: publishing with an unknown Variable
 * fails with the field and the name. Drafts save, so work isn't lost.
 */
export const validateVariables: CollectionBeforeChangeHook = async ({
  collection,
  data,
  originalDoc,
  req,
}) => {
  if (data._status !== "published") return data
  const values = await siteVariables(req, data.site ?? originalDoc?.site)
  if (!values) return data
  const { errors } = checkVariables(data, values)
  if (errors.length === 0) return data
  throw new ValidationError(
    {
      collection: collection.slug,
      errors: errors.map((issue) => ({
        path: issue.path,
        message: issueMessage(issue),
      })),
      req,
    },
    req.t
  )
}

/**
 * The Variables help panel, for a collection's sidebar: every Variable of
 * the document's Site with its current value, and the problems in the copy
 * being edited.
 */
export function variablesHelpField(): UIField {
  return {
    name: "variablesHelp",
    type: "ui",
    admin: {
      position: "sidebar",
      components: { Field: "/variables/VariablesHelp#VariablesHelp" },
    },
  }
}
