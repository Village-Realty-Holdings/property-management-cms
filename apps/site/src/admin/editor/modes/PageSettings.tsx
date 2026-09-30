"use client"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

import { DeletePageButton } from "../../components/DeletePageButton"
import { describedBy, FormField } from "../../components/FormBits"
import type { PageStatus } from "../../dashboard/pageStatus"
import type { Dependent } from "../../kit"
import { useEditor } from "../EditorProvider"
import type { BlockValues } from "../../pageForm"
import type { PageDocument } from "../state"
import { fieldErrorFor, type SaveProblem } from "./saveProblem"

/** The Layout a Page resolves to, for its locked header and footer. */
export type ResolvedLayout = {
  id: number
  name: string
  /** How the Page came to use it: "Listings, via /stays", "Main (default)". */
  label: string
  header: BlockValues[]
  footer: BlockValues[]
}

/**
 * The Page tab: the Page's own settings (title, path, SEO), the Layout it
 * uses, and taking the Page off the Site or deleting it. Every change goes
 * into the editor's document at once, so the top bar shows a new title as it
 * is typed, and Save and Publish send it with the Blocks.
 */
export function PageSettings({
  id,
  status,
  layout,
  dependents,
  problem,
  busy,
  onUnpublish,
  onDeleted,
}: {
  /** Null while the Page has not been saved yet. */
  id: number | null
  status: PageStatus
  layout: ResolvedLayout | null
  dependents: readonly Dependent[]
  problem: SaveProblem | null
  busy: boolean
  onUnpublish: () => void
  onDeleted: () => void
}) {
  const { doc, setField } = useEditor()
  if (doc.kind !== "page") return null
  const page: PageDocument = doc

  const field = (
    name: string,
    path: string,
    label: string,
    value: string,
    options: { description?: string; multiline?: boolean } = {}
  ) => {
    const error = fieldErrorFor(problem, path)
    const props = {
      id: `page-${name}`,
      value,
      onChange: (event: { target: { value: string } }) =>
        setField(path, event.target.value),
      ...describedBy(`page-${name}`, {
        description: options.description,
        error,
      }),
    }
    return (
      <FormField
        id={`page-${name}`}
        label={label}
        description={options.description}
        error={error}
      >
        {options.multiline ? (
          <Textarea {...props} rows={3} />
        ) : (
          <Input {...props} />
        )}
      </FormField>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="sr-only">Page settings</h2>
      {field("title", "title", "Title", page.title)}
      {field("path", "path", "Path", page.path, {
        description:
          'Where the Page lives on the Site: "/" for Home, "/about".',
      })}

      <section aria-labelledby="page-layout-heading" className="grid gap-1.5">
        <h3 id="page-layout-heading" className="text-sm font-medium">
          Layout
        </h3>
        <p className="text-sm text-muted-foreground">
          {layout ? layout.label : "No Layout"}
        </p>
        <p className="text-xs text-muted-foreground">
          The Layout is shown locked on the canvas. Use Edit Layout in the top
          bar to change it.
        </p>
      </section>

      <section aria-labelledby="page-seo-heading" className="grid gap-3">
        <h3 id="page-seo-heading" className="text-sm font-medium">
          SEO
        </h3>
        {field("seo-title", "seo.title", "SEO title", page.seo.title, {
          description: "Shown in search results. Leave empty for the default.",
        })}
        {field(
          "seo-description",
          "seo.description",
          "SEO description",
          page.seo.description,
          {
            description: "A sentence for search results and link previews.",
            multiline: true,
          }
        )}
      </section>

      {id !== null && (
        <section
          aria-labelledby="page-danger-heading"
          className="grid gap-2 border-t pt-4"
        >
          <h3 id="page-danger-heading" className="text-sm font-medium">
            Take away
          </h3>
          {status !== "draft" && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onUnpublish}
            >
              Unpublish
            </Button>
          )}
          <DeletePageButton
            id={id}
            title={page.title}
            path={page.path}
            published={status !== "draft"}
            dependents={dependents}
            onDeleted={onDeleted}
          />
        </section>
      )}
    </div>
  )
}
