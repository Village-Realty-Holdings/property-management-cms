"use client"

import { useCallback, useMemo, useState } from "react"
import type { Block } from "payload"

import type { MediaOption } from "../components/MediaSelect"
import { useEditor } from "./EditorProvider"
import { FieldsProvider, pathKey, type PageOption } from "./fields/context"
import { FieldList } from "./fields/FieldList"
import { planWrite, type Segment } from "./fields/values"
import { findBlock } from "./state"

/**
 * The Block tab: the selected Block's settings, as a form made from the
 * Block's Payload config, so a Block's fields are declared once. Every change
 * is dispatched at once, so the canvas shows it without a network round trip.
 *
 * `blocks` are the configs the document's Blocks come from (`pageBlocks`,
 * `headerBlocks` and `footerBlocks` together). They are passed in because
 * their field rules are functions, which a server component can't hand to
 * the browser; whoever mounts the panel imports them.
 */
export function BlockPanel({
  blocks,
  media = [],
  pages = [],
}: {
  blocks: readonly Block[]
  /** The Media an image field can pick from. */
  media?: readonly MediaOption[]
  /** The Pages a link field can pick from. */
  pages?: readonly PageOption[]
}) {
  const { doc, selectedId } = useEditor()
  const found = selectedId ? findBlock(doc, selectedId) : null

  if (!found) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Select a Block to edit its settings.
      </p>
    )
  }

  const config = blocks.find((block) => block.slug === found.block.blockType)
  if (!config) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        This Block has no settings to edit.
      </p>
    )
  }

  return (
    // A new selection starts with nothing touched, so no errors show yet.
    <BlockForm
      key={selectedId}
      config={config}
      blockId={selectedId!}
      blockPath={found.path}
      values={found.block as unknown as Record<string, unknown>}
      media={media}
      pages={pages}
    />
  )
}

function BlockForm({
  config,
  blockId,
  blockPath,
  values,
  media,
  pages,
}: {
  config: Block
  blockId: string
  blockPath: readonly Segment[]
  values: Record<string, unknown>
  media: readonly MediaOption[]
  pages: readonly PageOption[]
}) {
  const { doc, setField } = useEditor()
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set())

  const touch = useCallback((path: readonly Segment[]) => {
    const key = pathKey(path)
    setTouched((current) =>
      current.has(key) ? current : new Set(current).add(key)
    )
  }, [])

  const write = useCallback(
    (path: readonly Segment[], value: unknown) => {
      const edit = planWrite(doc, [...blockPath, ...path], value)
      setField(edit.path, edit.value)
    },
    [doc, blockPath, setField]
  )

  const env = useMemo(
    () => ({
      idPrefix: `block-${blockId}`,
      block: values,
      media,
      pages,
      touched,
      touch,
      write,
    }),
    [blockId, values, media, pages, touched, touch, write]
  )

  const label =
    typeof config.labels?.singular === "string"
      ? config.labels.singular
      : config.slug

  return (
    <FieldsProvider value={env}>
      <form
        className="flex flex-col gap-4 p-4"
        aria-label={`${label} settings`}
        onSubmit={(event) => event.preventDefault()}
        noValidate
      >
        <h2 className="text-sm font-semibold">{label}</h2>
        <FieldList fields={config.fields} path={[]} sibling={values} />
      </form>
    </FieldsProvider>
  )
}
