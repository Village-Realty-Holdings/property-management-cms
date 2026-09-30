"use client"

import { useEffect, useRef, useState } from "react"
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
import { describedBy, FormField, Section } from "./FormBits"
import { MediaSelect, type MediaOption } from "./MediaSelect"

/**
 * A React key for a Block that stays with it as Blocks move, saved or not.
 * Never rendered into the page, so the server and the browser need not agree.
 */
let blockKeySeq = 0
const newBlockKey = () => `block-${++blockKeySeq}`

/** Where keyboard focus goes once a Block move or removal has rendered. */
type FocusTarget =
  | { kind: "move"; key: string; by: -1 | 1 }
  | { kind: "block"; key: string }
  | { kind: "add" }

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
  // One key per Block, in step with `values.blocks`.
  const [keys, setKeys] = useState(() => initial.blocks.map(newBlockKey))
  const [announcement, setAnnouncement] = useState("")
  const formRef = useRef<HTMLFormElement>(null)
  const pendingFocus = useRef<FocusTarget | null>(null)
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
      "blocks",
      values.blocks.map((b, i) => (i === index ? block : b))
    )
  const blockLabel = (block: BlockValues) =>
    BLOCK_TYPES.find((t) => t.blockType === block.blockType)?.label ?? "Block"
  const addBlock = (blockType: BlockValues["blockType"]) => {
    set("blocks", [...values.blocks, emptyBlock(blockType)])
    setKeys((current) => [...current, newBlockKey()])
  }
  const moveBlock = (index: number, by: -1 | 1) => {
    const blocks = [...values.blocks]
    const [block] = blocks.splice(index, 1)
    blocks.splice(index + by, 0, block!)
    const moved = [...keys]
    const [key] = moved.splice(index, 1)
    moved.splice(index + by, 0, key!)
    pendingFocus.current = { kind: "move", key: key!, by }
    setAnnouncement(
      `Moved ${blockLabel(block!)} to position ${index + by + 1} of ${blocks.length}.`
    )
    set("blocks", blocks)
    setKeys(moved)
  }
  const removeBlock = (index: number) => {
    const blocks = values.blocks.filter((_, i) => i !== index)
    const remaining = keys.filter((_, i) => i !== index)
    // The Block before the one removed, else the one that took its place.
    const next = remaining[Math.max(index - 1, 0)]
    pendingFocus.current = next ? { kind: "block", key: next } : { kind: "add" }
    const removed = blockLabel(values.blocks[index]!)
    setAnnouncement(
      blocks.length === 0
        ? `Removed ${removed}. No Blocks left.`
        : `Removed ${removed}. ${blocks.length} ${blocks.length === 1 ? "Block" : "Blocks"} left.`
    )
    set("blocks", blocks)
    setKeys(remaining)
  }

  // A moved or removed Block's controls are new DOM nodes, so keyboard focus
  // would fall to the page: put it back once the change has rendered.
  useEffect(() => {
    const target = pendingFocus.current
    pendingFocus.current = null
    const form = formRef.current
    if (!target || !form) return
    if (target.kind === "add") {
      form.querySelector<HTMLElement>("[data-add-block]")?.focus()
      return
    }
    const card =
      form.querySelectorAll<HTMLElement>("[data-block-card]")[
        keys.indexOf(target.key)
      ]
    if (!card) return
    if (target.kind === "block") {
      card.focus()
      return
    }
    // The control that was pressed, or the other arrow if the Block is now
    // first or last and that one is disabled.
    const first = card.querySelector<HTMLButtonElement>(
      `[data-move="${target.by}"]`
    )
    const other = card.querySelector<HTMLButtonElement>(
      `[data-move="${-target.by}"]`
    )
    ;(first?.disabled ? other : first)?.focus()
  }, [keys])

  const isPublished = status === "published" || status === "changes"

  return (
    <div className="flex flex-col gap-10">
      <form
        ref={formRef}
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
        <p role="status" aria-label="Block changes" className="sr-only">
          {announcement}
        </p>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-6">
            <Section title="Page">
              <FormField id="title" label="Title" error={errors.title}>
                <Input
                  id="title"
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                  {...describedBy("title", { error: errors.title })}
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
                  {...describedBy("path", {
                    description: true,
                    error: errors.path,
                  })}
                />
              </FormField>
            </Section>

            <Section
              title="Blocks"
              description="The sections of the Page, top to bottom."
            >
              {values.blocks.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No Blocks yet. Add a Hero to start the Page.
                </p>
              )}
              {values.blocks.map((block, index) => (
                <BlockCard
                  key={keys[index]}
                  index={index}
                  count={values.blocks.length}
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
                    data-add-block={type.blockType === "hero" ? "" : undefined}
                    onClick={() => addBlock(type.blockType)}
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
                {...describedBy("seo-title", {
                  description: true,
                  error: errors["seo.title"],
                })}
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
                {...describedBy("seo-description", {
                  error: errors["seo.description"],
                })}
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
                {...describedBy("seo-image", { error: errors["seo.image"] })}
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
  const at = (field: string) => `blocks.${index}.${field}`
  const id = (field: string) => `block-${index}-${field}`
  /** Ties a control to its FormField's description and error. */
  const aria = (
    field: string,
    error: string | undefined,
    description = false
  ) => describedBy(id(field), { description, error })
  const hasError = Object.keys(errors).some((path) =>
    path.startsWith(`blocks.${index}.`)
  )

  return (
    <div
      role="group"
      aria-label={`${index + 1}. ${label}`}
      tabIndex={-1}
      data-block-card
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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
            data-move="-1"
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
            data-move="1"
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
              {...aria("heading", errors[at("heading")])}
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
              {...aria("subheading", errors[at("subheading")])}
            />
          </FormField>
          <FormField id={id("image")} label="Image" error={errors[at("image")]}>
            <MediaSelect
              id={id("image")}
              value={block.image}
              options={media}
              onChange={(image) => onChange({ ...block, image })}
              {...aria("image", errors[at("image")])}
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
            {...aria("markdown", errors[at("content")], true)}
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
              {...aria("heading", errors[at("heading")])}
            />
          </FormField>
          <FormField id={id("body")} label="Text" error={errors[at("body")]}>
            <Textarea
              id={id("body")}
              value={block.body}
              onChange={(e) => onChange({ ...block, body: e.target.value })}
              {...aria("body", errors[at("body")])}
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
              {...aria("style", errors[at("style")])}
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
          {...describedBy(`${idPrefix}-href`, { description: true, error })}
        />
      </FormField>
    </div>
  )
}
