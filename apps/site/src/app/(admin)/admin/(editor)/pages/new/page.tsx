import type { Metadata } from "next"

import { newPageDocument } from "@/admin/editor/modes/pageDocument"
import {
  loadLayoutOptions,
  loadPickers,
} from "@/admin/editor/modes/loadPageMode"
import { PageMode } from "@/admin/editor/modes/PageMode"
import { newPageStartAs, type NewPageParams } from "@/admin/newPage"
import { loadPageTemplateStart } from "@/admin/pageTemplates"
import { requireUser } from "@/admin/session"
import { editingUrl } from "@/site/editing/flag"

export const metadata: Metadata = { title: "New Page" }

type Props = { searchParams: Promise<NewPageParams> }

/**
 * A New Page, in the Visual Editor's Page mode: with a Hero, or with a copy of
 * a Page Template's Blocks and its Layout choice (`?template=<id>`, a Page's
 * id; one that is gone or is no longer a Page Template gives the blank Page).
 * The New Page dialog sends the Title and Path (`?title=…&path=…`); each is
 * checked again here, and one that is missing or unusable falls back to
 * "Untitled Page" at a free "/untitled-page". It is not created until its
 * first Save, so opening New Page and leaving leaves nothing behind.
 */
export default async function NewPage({ searchParams }: Props) {
  const params = await searchParams
  const session = await requireUser()
  const { payload, as } = session

  const { title, path } = await newPageStartAs(payload, as, params)
  const blank = { ...newPageDocument(path), title }
  const { template } = params
  const start =
    typeof template === "string"
      ? await loadPageTemplateStart(payload, as, Number(template))
      : null
  const initial = start ? { ...blank, ...start } : blank

  return (
    <PageMode
      id={null}
      initial={initial}
      status="draft"
      publishedPath={null}
      layouts={await loadLayoutOptions(payload)}
      dependents={[]}
      canvasSrc={editingUrl(initial.path)}
      {...await loadPickers(session)}
    />
  )
}
