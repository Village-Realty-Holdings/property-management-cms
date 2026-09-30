"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { savePage } from "../actions/pages"
import type { PageStatus } from "../dashboard/pageStatus"
import type { FormState } from "../formState"
import {
  InlineError,
  isDirty,
  notify,
  UnsavedChangesDialog,
  useUnsavedChangesGuard,
  type Dependent,
} from "../kit"
import {
  BLOCK_TYPES,
  emptyBlock,
  type BlockValues,
  type LinkValues,
  type PageValues,
} from "../pageForm"
import type { PageIntent, PageSaveResult } from "../pageSave"
import { DeletePageButton } from "./DeletePageButton"
import { FormField, Section } from "./FormBits"
import { MediaSelect, type MediaOption } from "./MediaSelect"

export type EditorStatus = "new" | PageStatus

const statusLabels: Record<EditorStatus, string> = {
  new: "New",
  draft: "Draft",
  published: "Published",
  changes: "Published, with unpublished changes",
}

/**
 * The Page form: title, path, Blocks and SEO, saved as a Draft or
 * published. Plain forms for now; the Visual Editor replaces the Blocks
 * part (apps/site ADR-0002).
 *
 * Saves go through a Server Action and stay on the page: a toast confirms
 * them, failures show inline, and what was typed is never lost. Leaving with
 * unsaved changes asks first (the shared guard from the Admin kit).
 */
export function PageEditor({
  id: initialId,
  initial,
  status: initialStatus,
  media,
  dependents,
}: {
  id: number | null
  initial: PageValues
  status: EditorStatus
  media: MediaOption[]
  /** The Pages whose buttons link to this Page, named when deleting it. */
  dependents: readonly Dependent[]
}) {
  const [id, setId] = useState(initialId)
  const [values, setValues] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [status, setStatus] = useState(initialStatus)
  const [state, setState] = useState<FormState>({})
  const [pending, setPending] = useState(false)
  // Where to go once this render has settled (see the effect below).
  const [goTo, setGoTo] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)
  const errors = state.fieldErrors ?? {}
  const dirty = isDirty(saved, values) && !deleted

  const { dialog, router } = useUnsavedChangesGuard({
    dirty,
    onSave: () => submit("draft", { leaving: true }),
  })

  // Moving on is a step of its own, after the render that made the editor
  // clean: the guarded router reads `dirty` from the latest render, so a save
  // (or a delete) that navigated straight away would be asked about.
  useEffect(() => {
    if (goTo && !dirty) router.replace(goTo)
  }, [goTo, dirty, router])

  /**
   * Saves as `intent`. `leaving` is set when the unsaved-changes dialog
   * saves: the guard then takes the user on to where they were going.
   */
  async function submit(
    intent: PageIntent,
    { leaving = false }: { leaving?: boolean } = {}
  ): Promise<FormState> {
    if (pending) return { ok: false, message: "Already saving." }
    const submitted = values
    setPending(true)
    let result: PageSaveResult
    try {
      result = await savePage({ id, intent, values: submitted })
    } catch {
      result = {
        ok: false,
        message: "Could not save. Check your connection and try again.",
      }
    }
    setPending(false)
    setState(result)
    if (!result.ok) return result

    notify.success(result.message || "Saved")
    if (result.status) setStatus(result.status)
    if (result.id != null) setId(result.id)
    if (result.values) {
      const stored = result.values
      setSaved(stored)
      // Show what was stored (generated path, Block ids), unless typing
      // carried on meanwhile.
      setValues((current) => (isDirty(submitted, current) ? current : stored))
    }
    // A new Page now has an address of its own.
    if (id == null && result.id != null && !leaving) {
      setGoTo(`/admin/pages/${result.id}`)
    }
    return result
  }

  const set = <K extends keyof PageValues>(key: K, value: PageValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))
  const setBlock = (index: number, block: BlockValues) =>
    set(
      "layout",
      values.layout.map((b, i) => (i === index ? block : b))
    )
  const moveBlock = (index: number, by: -1 | 1) => {
    const layout = [...values.layout]
    const [block] = layout.splice(index, 1)
    layout.splice(index + by, 0, block!)
    set("layout", layout)
  }
  const removeBlock = (index: number) =>
    set(
      "layout",
      values.layout.filter((_, i) => i !== index)
    )

  const isPublished = status === "published" || status === "changes"

  return (
    <div className="flex flex-col gap-10">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit("draft")
        }}
        className="flex flex-col gap-6"
      >
        <UnsavedChangesDialog {...dialog} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Link
              href="/admin/pages"
              className="text-sm text-muted-foreground hover:underline"
            >
              ← Pages
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                {values.title || "New Page"}
              </h1>
              <Badge variant={isPublished ? "default" : "secondary"}>
                {statusLabels[status]}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <span role="status" className="text-sm text-muted-foreground">
                Unsaved changes
              </span>
            )}
            {isPublished && saved.path && (
              <a
                href={saved.path}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "ghost" })}
              >
                <ExternalLinkIcon /> View on Site
              </a>
            )}
            {isPublished && (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void submit("unpublish")}
              >
                Unpublish
              </Button>
            )}
            <Button type="submit" variant="outline" disabled={pending}>
              Save draft
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => void submit("publish")}
            >
              Publish
            </Button>
          </div>
        </div>

        {state.ok === false && state.message && (
          <InlineError>{state.message}</InlineError>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-6">
            <Section title="Page">
              <FormField id="title" label="Title" error={errors.title}>
                <Input
                  id="title"
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                />
              </FormField>
              <FormField
                id="path"
                label="Path"
                description='Where the Page lives on the Site: "/" for Home, "/about". Filled in from the title when left empty.'
                error={errors.path}
              >
                <Input
                  id="path"
                  value={values.path}
                  placeholder="/about"
                  onChange={(e) => set("path", e.target.value)}
                />
              </FormField>
            </Section>

            <Section
              title="Blocks"
              description="The sections of the Page, top to bottom."
            >
              {values.layout.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No Blocks yet. Add a Hero to start the Page.
                </p>
              )}
              {values.layout.map((block, index) => (
                <BlockCard
                  key={block.id ?? `new-${index}`}
                  index={index}
                  count={values.layout.length}
                  block={block}
                  media={media}
                  errors={errors}
                  onChange={(next) => setBlock(index, next)}
                  onMove={(by) => moveBlock(index, by)}
                  onRemove={() => removeBlock(index)}
                />
              ))}
              <div className="flex flex-wrap gap-2">
                {BLOCK_TYPES.map((type) => (
                  <Button
                    key={type.blockType}
                    type="button"
                    variant="outline"
                    title={type.description}
                    onClick={() =>
                      set("layout", [
                        ...values.layout,
                        emptyBlock(type.blockType),
                      ])
                    }
                  >
                    <PlusIcon /> {type.label}
                  </Button>
                ))}
              </div>
            </Section>
          </div>

          <Section
            title="SEO"
            description="How the Page appears in search results and when shared."
          >
            <FormField
              id="seo-title"
              label="SEO title"
              description="Defaults to the Page title."
              error={errors["seo.title"]}
            >
              <Input
                id="seo-title"
                value={values.seo.title}
                onChange={(e) =>
                  set("seo", { ...values.seo, title: e.target.value })
                }
              />
            </FormField>
            <FormField
              id="seo-description"
              label="SEO description"
              error={errors["seo.description"]}
            >
              <Textarea
                id="seo-description"
                value={values.seo.description}
                onChange={(e) =>
                  set("seo", { ...values.seo, description: e.target.value })
                }
              />
            </FormField>
            <FormField
              id="seo-image"
              label="SEO image"
              error={errors["seo.image"]}
            >
              <MediaSelect
                id="seo-image"
                value={values.seo.image}
                options={media}
                onChange={(image) => set("seo", { ...values.seo, image })}
              />
            </FormField>
          </Section>
        </div>
      </form>

      {id != null && (
        <div className="flex justify-end border-t pt-6">
          <DeletePageButton
            id={id}
            title={saved.title}
            path={saved.path}
            published={isPublished}
            dependents={dependents}
            onDeleted={() => {
              setDeleted(true)
              setGoTo("/admin/pages")
            }}
          />
        </div>
      )}
    </div>
  )
}

function BlockCard({
  index,
  count,
  block,
  media,
  errors,
  onChange,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  block: BlockValues
  media: MediaOption[]
  errors: Record<string, string>
  onChange: (block: BlockValues) => void
  onMove: (by: -1 | 1) => void
  onRemove: () => void
}) {
  const label = BLOCK_TYPES.find((t) => t.blockType === block.blockType)?.label
  const at = (field: string) => `layout.${index}.${field}`
  const id = (field: string) => `block-${index}-${field}`
  const hasError = Object.keys(errors).some((path) =>
    path.startsWith(`layout.${index}.`)
  )

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-4",
        hasError && "border-destructive/50"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {index + 1}. {label}
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Move down"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove Block"
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>

      {block.blockType === "hero" && (
        <>
          <FormField
            id={id("heading")}
            label="Heading"
            error={errors[at("heading")]}
          >
            <Input
              id={id("heading")}
              value={block.heading}
              onChange={(e) => onChange({ ...block, heading: e.target.value })}
            />
          </FormField>
          <FormField
            id={id("subheading")}
            label="Subheading"
            error={errors[at("subheading")]}
          >
            <Textarea
              id={id("subheading")}
              value={block.subheading}
              onChange={(e) =>
                onChange({ ...block, subheading: e.target.value })
              }
            />
          </FormField>
          <FormField id={id("image")} label="Image" error={errors[at("image")]}>
            <MediaSelect
              id={id("image")}
              value={block.image}
              options={media}
              onChange={(image) => onChange({ ...block, image })}
            />
          </FormField>
          <LinkFields
            idPrefix={id("cta")}
            label="Button"
            value={block.cta}
            error={errors[at("cta.href")]}
            onChange={(cta) => onChange({ ...block, cta })}
          />
        </>
      )}

      {block.blockType === "richText" && (
        <FormField
          id={id("markdown")}
          label="Text"
          description="Markdown: ## for headings, - for lists, **bold**, [links](/about)."
          error={errors[at("content")]}
        >
          <Textarea
            id={id("markdown")}
            rows={8}
            className="font-mono text-sm"
            value={block.markdown}
            onChange={(e) => onChange({ ...block, markdown: e.target.value })}
          />
        </FormField>
      )}

      {block.blockType === "callToAction" && (
        <>
          <FormField
            id={id("heading")}
            label="Heading"
            error={errors[at("heading")]}
          >
            <Input
              id={id("heading")}
              value={block.heading}
              onChange={(e) => onChange({ ...block, heading: e.target.value })}
            />
          </FormField>
          <FormField id={id("body")} label="Text" error={errors[at("body")]}>
            <Textarea
              id={id("body")}
              value={block.body}
              onChange={(e) => onChange({ ...block, body: e.target.value })}
            />
          </FormField>
          <LinkFields
            idPrefix={id("button")}
            label="Button"
            value={block.button}
            error={errors[at("button.href")]}
            onChange={(button) => onChange({ ...block, button })}
          />
          <FormField id={id("style")} label="Style" error={errors[at("style")]}>
            <NativeSelect
              id={id("style")}
              value={block.style}
              onChange={(e) =>
                onChange({
                  ...block,
                  style: e.target.value as typeof block.style,
                })
              }
            >
              <NativeSelectOption value="primary">
                Primary colour
              </NativeSelectOption>
              <NativeSelectOption value="secondary">Quiet</NativeSelectOption>
              <NativeSelectOption value="inverted">
                Accent colour
              </NativeSelectOption>
            </NativeSelect>
          </FormField>
        </>
      )}
    </div>
  )
}

function LinkFields({
  idPrefix,
  label,
  value,
  error,
  onChange,
}: {
  idPrefix: string
  label: string
  value: LinkValues
  error?: string
  onChange: (value: LinkValues) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id={`${idPrefix}-label`} label={`${label} text`}>
        <Input
          id={`${idPrefix}-label`}
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </FormField>
      <FormField
        id={`${idPrefix}-href`}
        label={`${label} link`}
        description='A Site path like "/about", or a full URL.'
        error={error}
      >
        <Input
          id={`${idPrefix}-href`}
          value={value.href}
          onChange={(e) => onChange({ ...value, href: e.target.value })}
        />
      </FormField>
    </div>
  )
}
