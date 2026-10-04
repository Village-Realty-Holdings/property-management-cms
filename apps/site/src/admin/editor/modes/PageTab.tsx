"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { TriangleAlertIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FieldDescription } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Textarea } from "@workspace/ui/components/textarea"

import { checkPagePath } from "../../../collections/Pages/path"
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "../../../fields/seo"
import { makeLayoutFromPageDocument } from "../../actions/layouts"
import { linksToPath } from "../../actions/links"
import { DeletePageButton } from "../../components/DeletePageButton"
import { describedBy, FormField } from "../../components/FormBits"
import { MediaSelect, type MediaOption } from "../../components/MediaSelect"
import type { PageStatus } from "../../dashboard/pageStatus"
import { InlineError, notify, type Dependent } from "../../kit"
import type { LinkUse } from "../../links/screen"
import { useEditor } from "../EditorProvider"
import type { LayoutChoice, PageDocument } from "../state"
import {
  describeLayoutUse,
  nextPathForTitle,
  seoCount,
  suggestLayoutName,
  type LayoutOption,
  type ResolvedLayout,
} from "./pageTabModel"
import { fieldErrorFor, type SaveProblem } from "./saveProblem"

/**
 * The Page tab: the Page's own settings (title, path), the Layout it uses
 * (by its path, a specific one, or none, with "Make a new Layout from this
 * one"), its SEO, and taking it off the Site or deleting it. Every change goes
 * into the editor's document at once, so the top bar shows a new title as it
 * is typed, the canvas wears the Layout as soon as it is picked, and Save and
 * Publish send it all with the Blocks.
 */
export function PageTab({
  id,
  status,
  publishedPath,
  layouts,
  layout,
  media,
  dependents,
  problem,
  busy,
  onUnpublish,
  onDeleted,
  onLayoutMade,
}: {
  /** Null while the Page has not been saved yet. */
  id: number | null
  status: PageStatus
  /** The path visitors are served the Page at; null while it is not Published. */
  publishedPath: string | null
  /** Every Layout the Page can pick. */
  layouts: readonly LayoutOption[]
  /** The Layout the Page resolves to now; null for none. */
  layout: ResolvedLayout | null
  media: readonly MediaOption[]
  dependents: readonly Dependent[]
  problem: SaveProblem | null
  busy: boolean
  onUnpublish: () => void
  onDeleted: () => void
  /** The Draft was switched to a Layout made from the Page's own. */
  onLayoutMade: (layout: LayoutOption) => void
}) {
  const { doc, setField } = useEditor()
  // A New Page's path follows its title as it is typed, unless the User
  // has written the path themselves. This is the title the path was last made
  // from: a title emptied and typed again still finds the path it moved.
  const pathTitle = useRef<string | null>(null)
  if (doc.kind !== "page") return null
  const page: PageDocument = doc

  const inputProps = (name: string, path: string, value: string) => ({
    id: `page-${name}`,
    value,
    onChange: (event: { target: { value: string } }) =>
      setField(path, event.target.value),
  })

  const titleError = fieldErrorFor(problem, "title")
  const pathError =
    fieldErrorFor(problem, "path") ??
    (() => {
      const shape = checkPagePath(page.path)
      return shape === true ? undefined : shape
    })()
  const seoTitle = seoCount(page.seo.title, SEO_TITLE_MAX)
  const seoDescription = seoCount(page.seo.description, SEO_DESCRIPTION_MAX)

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="sr-only">Page settings</h2>

      <FormField id="page-title" label="Title" error={titleError}>
        <Input
          {...inputProps("title", "title", page.title)}
          onChange={(event) => {
            const to = event.target.value
            setField("title", to)
            const from = (pathTitle.current ??= page.title)
            const next = nextPathForTitle({
              saved: id !== null,
              path: page.path,
              from,
              to,
            })
            if (next !== null) {
              setField("path", next)
              pathTitle.current = to
            }
          }}
          {...describedBy("page-title", { error: titleError })}
        />
      </FormField>

      <FormField
        id="page-path"
        label="Path"
        description='Where the Page lives on the Site: "/" for Home, "/about".'
        error={pathError}
      >
        <Input
          {...inputProps("path", "path", page.path)}
          {...describedBy("page-path", {
            description: true,
            error: pathError,
            also: [PATH_NOTICE_ID],
          })}
        />
      </FormField>
      <PathChangeNotice
        // A Page not yet on the Site has no visitors or links to lose.
        oldPath={
          id !== null && publishedPath !== null && page.path !== publishedPath
            ? publishedPath
            : null
        }
      />

      <LayoutSection
        pageId={id}
        pageTitle={page.title}
        choice={page.layout}
        layouts={layouts}
        resolved={layout}
        onChoose={(choice) => setField("layout", choice)}
        onMade={onLayoutMade}
      />

      <section aria-labelledby="page-seo-heading" className="grid gap-3">
        <h3 id="page-seo-heading" className="text-sm font-medium">
          SEO
        </h3>
        <FormField
          id="page-seo-title"
          label="SEO title"
          error={fieldErrorFor(problem, "seo.title")}
        >
          <Input
            {...inputProps("seo-title", "seo.title", page.seo.title)}
            {...describedBy("page-seo-title", {
              description: true,
              also: ["page-seo-title-count"],
              error: fieldErrorFor(problem, "seo.title"),
            })}
          />
          <FieldDescription id="page-seo-title-description">
            Shown in search results. Leave empty for the default.
          </FieldDescription>
          <Counter id="page-seo-title-count" count={seoTitle} />
        </FormField>
        <FormField
          id="page-seo-description"
          label="SEO description"
          error={fieldErrorFor(problem, "seo.description")}
        >
          <Textarea
            {...inputProps(
              "seo-description",
              "seo.description",
              page.seo.description
            )}
            rows={3}
            {...describedBy("page-seo-description", {
              description: true,
              also: ["page-seo-description-count"],
              error: fieldErrorFor(problem, "seo.description"),
            })}
          />
          <FieldDescription id="page-seo-description-description">
            A sentence for search results and link previews.
          </FieldDescription>
          <Counter id="page-seo-description-count" count={seoDescription} />
        </FormField>
        <FormField
          id="page-seo-image"
          label="SEO image"
          description="The picture shown when a link to the Page is shared."
          error={fieldErrorFor(problem, "seo.image")}
        >
          <MediaSelect
            id="page-seo-image"
            value={page.seo.image}
            options={[...media]}
            onChange={(value) => setField("seo.image", value)}
            {...describedBy("page-seo-image", {
              description: true,
              error: fieldErrorFor(problem, "seo.image"),
            })}
          />
        </FormField>
      </section>

      <section
        aria-labelledby="page-template-heading"
        className="grid gap-2 border-t pt-4"
      >
        <h3 id="page-template-heading" className="text-sm font-medium">
          Page Template
        </h3>
        <div className="flex items-center gap-2">
          <input
            id="page-is-template"
            type="checkbox"
            checked={page.isTemplate === true}
            // A live Page is unpublished first; one already on can be turned off.
            disabled={status !== "draft" && page.isTemplate !== true}
            aria-describedby="page-is-template-description"
            onChange={(event) => setField("isTemplate", event.target.checked)}
            className="size-4 accent-primary"
          />
          <label htmlFor="page-is-template" className="text-sm">
            Use as a Page Template
          </label>
        </div>
        <FieldDescription id="page-is-template-description">
          {status !== "draft" && page.isTemplate !== true
            ? "Unpublish the Page first: a Page Template stays off the Site."
            : "New Pages can start from a copy of this Page. It can't be published while this is on."}
        </FieldDescription>
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

/** The notice's id, so the Path field is described by it when it shows. */
const PATH_NOTICE_ID = "page-path-change-notice"

/** The most links the notice lists; the Links tool has the rest. */
const NOTICE_LIMIT = 5

/**
 * Under Path, when a Published Page's path is being changed: what still links
 * to the old path. Visitors who follow those links reach no Page once the new
 * path is published, and nothing changes them for the User. It never blocks
 * Save; it says where to look. Silent when nothing links there, and when the
 * lookup fails: it is advice, not a check.
 */
function PathChangeNotice({ oldPath }: { oldPath: string | null }) {
  // The lookup's answer, with the old path it was asked for.
  const [found, setFound] = useState<{
    path: string
    uses: readonly LinkUse[]
  } | null>(null)

  useEffect(() => {
    if (oldPath === null || found?.path === oldPath) return
    let current = true
    linksToPath(oldPath)
      .then((uses) => current && setFound({ path: oldPath, uses }))
      .catch(() => {})
    return () => {
      current = false
    }
  }, [oldPath, found?.path])

  if (oldPath === null || found?.path !== oldPath || found.uses.length === 0) {
    return null
  }
  const { uses } = found
  const shown = uses.slice(0, NOTICE_LIMIT)
  const more = uses.length - shown.length

  return (
    <div
      id={PATH_NOTICE_ID}
      role="status"
      data-slot="path-change-notice"
      className="grid gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="flex items-start gap-2">
        <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          {uses.length === 1
            ? `1 link still leads to “${oldPath}”.`
            : `${uses.length} links still lead to “${oldPath}”.`}{" "}
          They will not follow the Page to its new path, and visitors who use
          them will not find it. Saving does not change them.
        </span>
      </p>
      <ul className="grid gap-0.5 pl-6">
        {shown.map((use) => (
          <li key={`${use.href}|${use.place}`}>
            <Link href={use.href} className="underline underline-offset-2">
              {use.title}
            </Link>
            <span>
              {" "}
              ({use.kind}, {use.place})
            </span>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="pl-6">and {more} more.</p>}
      <p className="pl-6">
        <Link
          href="/admin/tools/links"
          className="underline underline-offset-2"
        >
          Open Tools, Links
        </Link>{" "}
        to see them all and point them at the new path.
      </p>
    </div>
  )
}

/** "12 / 60", in the warning colour, with advice, once it is over. Never blocks. */
function Counter({
  id,
  count,
}: {
  id: string
  count: { count: number; max: number; over: boolean }
}) {
  return (
    <p
      id={id}
      className={
        count.over
          ? "text-xs text-destructive-text"
          : "text-xs text-muted-foreground"
      }
    >
      {count.count} / {count.max} characters
      {count.over && ". Search engines may cut it off."}
    </p>
  )
}

const MODES = [
  { mode: "default", label: "Use the Layout for this path" },
  { mode: "layout", label: "A specific Layout" },
  { mode: "none", label: "No Layout" },
] as const

function LayoutSection({
  pageId,
  pageTitle,
  choice,
  layouts,
  resolved,
  onChoose,
  onMade,
}: {
  pageId: number | null
  pageTitle: string
  choice: LayoutChoice
  layouts: readonly LayoutOption[]
  resolved: ResolvedLayout | null
  onChoose: (choice: LayoutChoice) => void
  onMade: (layout: LayoutOption) => void
}) {
  const group = useId()

  const choose = (mode: LayoutChoice["mode"]) => {
    if (mode === choice.mode) return
    if (mode === "layout") {
      // A specific Layout needs one picked: start from the one in use.
      const start = resolved?.id ?? layouts[0]?.id
      if (start !== undefined) onChoose({ mode, layoutId: start })
    } else {
      onChoose({ mode })
    }
  }

  const summary = describeLayoutUse(choice, resolved)

  return (
    <fieldset className="grid gap-2" aria-describedby={`${group}-summary`}>
      <legend className="mb-1 text-sm font-medium">Layout</legend>
      {MODES.map(({ mode, label }) => (
        <label key={mode} className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`${group}-mode`}
            checked={choice.mode === mode}
            disabled={mode === "layout" && layouts.length === 0}
            onChange={() => choose(mode)}
            className="size-4 accent-primary"
          />
          {label}
        </label>
      ))}

      <p id={`${group}-summary`} className="text-sm text-muted-foreground">
        {summary}
      </p>
      {choice.mode === "layout" && (
        <FormField id={`${group}-pick`} label="Choose a Layout">
          <NativeSelect
            id={`${group}-pick`}
            className="w-full"
            value={choice.layoutId}
            onChange={(event) =>
              onChoose({ mode: "layout", layoutId: Number(event.target.value) })
            }
          >
            {layouts.map((option) => (
              <NativeSelectOption key={option.id} value={option.id}>
                {option.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
      )}

      <p className="text-xs text-muted-foreground">
        The Layout is shown locked on the canvas. Use Edit Layout in the top bar
        to change it.
      </p>

      <MakeLayoutFromThis
        pageId={pageId}
        pageTitle={pageTitle}
        source={resolved}
        layouts={layouts}
        onMade={onMade}
      />
    </fieldset>
  )
}

/**
 * "Make a new Layout from this one": asks for a name, copies the Layout the
 * Page uses under it, and switches the Page to the copy. The copy starts as an
 * exact duplicate, so the canvas looks the same until the new Layout is edited.
 */
function MakeLayoutFromThis({
  pageId,
  pageTitle,
  source,
  layouts,
  onMade,
}: {
  pageId: number | null
  pageTitle: string
  source: ResolvedLayout | null
  layouts: readonly LayoutOption[]
  onMade: (layout: LayoutOption) => void
}) {
  const { state, markSaved, setField } = useEditor()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const hint = useId()

  let why: ReactNode = null
  if (pageId === null) why = "Save the Page first."
  else if (!source) why = "The Page has no Layout to copy."

  const submit = async () => {
    if (!source || pageId === null || pending) return
    setPending(true)
    setError(null)
    try {
      const result = await makeLayoutFromPageDocument({
        pageId,
        layoutId: source.id,
        name,
      })
      if (!result.ok || !result.layout) {
        setError(result.message || "Could not make the Layout.")
        return
      }
      const made = result.layout
      // The server switched the Page's Draft: that is the saved baseline now,
      // and the User's other unsaved edits stay unsaved.
      const choice: LayoutChoice = { mode: "layout", layoutId: made.id }
      const baseline = state.baseline
      if (baseline.kind === "page") {
        const switched = { ...baseline, layout: choice }
        markSaved(switched, switched)
      }
      setField("layout", choice)
      onMade(made)
      setOpen(false)
      notify.success(result.message || "Layout made")
    } catch {
      setError("Could not make the Layout. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-1.5">
      <Button
        type="button"
        variant="outline"
        disabled={why !== null}
        aria-describedby={why ? hint : undefined}
        onClick={() => {
          setName(suggestLayoutName(source?.name ?? pageTitle, layouts))
          setError(null)
          setOpen(true)
        }}
      >
        Make a new Layout from this one
      </Button>
      {why && (
        <p id={hint} className="text-xs text-muted-foreground">
          {why}
        </p>
      )}

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <DialogHeader>
              <DialogTitle>Make a new Layout</DialogTitle>
              <DialogDescription>
                {source
                  ? `Copies “${source.name}” and switches this Page to the copy. Other Pages keep using “${source.name}”.`
                  : "Copies the Layout this Page uses."}
              </DialogDescription>
            </DialogHeader>
            <FormField id="make-layout-name" label="Name">
              <Input
                id="make-layout-name"
                value={name}
                autoComplete="off"
                onChange={(event) => setName(event.target.value)}
              />
            </FormField>
            {error && <InlineError>{error}</InlineError>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Making…" : "Make Layout"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
