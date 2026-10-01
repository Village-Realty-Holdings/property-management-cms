import { NotFound, type Payload } from "payload"

import { catalogue } from "../blocks/catalogue"
import { withoutRowIds } from "../layouts/duplicate"
import {
  ensureStarterTemplates,
  STARTER_TEMPLATES,
} from "../pageTemplates/starters"
import { pageDocumentFromPage } from "./editor/modes/pageDocument"
import type { PageDocument } from "./editor/state"
import { formStateFromError, type FormState } from "./formState"
import type { Access } from "./settingsSave"

/**
 * Page Templates for the Admin. A Page Template is a Page with "Use as a
 * Page Template" on (and so never published): this lists them and gives a New
 * Page its copy of one. Through the Local API with the caller's access
 * (apps/site ADR-0002), and apart from the Server Actions so it runs in tests
 * without Next.
 */

/** A Page Template as the lists show it. */
export type PageTemplateRow = {
  /** The Page's id. */
  id: number
  name: string
  /** Its Blocks' names, in order: "Hero", "Rich text". */
  blocks: string[]
  updatedAt: string
}

const blockLabel = (blockType: string) =>
  (catalogue as Record<string, { label: string } | undefined>)[blockType]
    ?.label ?? blockType

/** Every Page Template, by name. */
export async function loadPageTemplateRows(
  payload: Payload,
  access: Access
): Promise<PageTemplateRow[]> {
  const { docs } = await payload.find({
    collection: "pages",
    where: { isTemplate: { equals: true } },
    draft: true,
    pagination: false,
    sort: "title",
    depth: 0,
    select: { title: true, blocks: true, updatedAt: true },
    ...access,
  })
  return docs.map((doc) => ({
    id: doc.id,
    name: doc.title,
    blocks: (doc.blocks ?? []).map((block) => blockLabel(block.blockType)),
    updatedAt: doc.updatedAt,
  }))
}

/**
 * What a New Page made from the Page Template starts with: copies of its
 * Blocks (without the rows' ids, so the Page gets its own) and its choice of
 * Layout. Null when the Page is gone or is not a Page Template.
 */
export async function loadPageTemplateStart(
  payload: Payload,
  access: Access,
  id: number
): Promise<Pick<PageDocument, "blocks" | "layout"> | null> {
  if (!Number.isInteger(id) || id <= 0) return null
  try {
    const page = await payload.findByID({
      collection: "pages",
      id,
      draft: true,
      depth: 0,
      ...access,
    })
    if (!page.isTemplate) return null
    const { blocks, layout } = pageDocumentFromPage(page)
    return { blocks: withoutRowIds(blocks), layout }
  } catch (error) {
    if (error instanceof NotFound) return null
    throw error
  }
}

/** Whether a starter Page Template's path is still free, so it can be added. */
export async function startersMissing(
  payload: Payload,
  access: Access
): Promise<boolean> {
  const { totalDocs } = await payload.count({
    collection: "pages",
    where: { path: { in: STARTER_TEMPLATES.map((starter) => starter.path) } },
    ...access,
  })
  return totalDocs < STARTER_TEMPLATES.length
}

/** Adds the starter Page Templates the Site doesn't have yet. */
export async function addStarterTemplatesAs(
  payload: Payload,
  access: Access
): Promise<FormState> {
  try {
    const added = (await ensureStarterTemplates(payload, access)).filter(
      (starter) => starter.action === "created"
    )
    return {
      ok: true,
      message:
        added.length === 0
          ? "The starter Page Templates are already here."
          : `Added ${added.map((starter) => `“${starter.title}”`).join(" and ")}.`,
    }
  } catch (error) {
    return formStateFromError(error)
  }
}
