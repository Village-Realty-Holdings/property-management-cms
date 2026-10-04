"use client"

import { useCallback, useMemo, useState } from "react"
import type { Block, Field } from "payload"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import type { MediaOption } from "../components/MediaSelect"
import { useEditor } from "./EditorProvider"
import { FieldsProvider, pathKey, type PageOption } from "./fields/context"
import { FieldList } from "./fields/FieldList"
import { planWrite, type Segment } from "./fields/values"
import { findBlock, placeName } from "./state"

/**
 * The Block tab: the selected Block's settings, as a form made from the
 * Block's Payload config, so a Block's fields are declared once. A Block with
 * style settings (its background and text colour) shows them under Style,
 * beside Content. Every change
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
      place={found.parentId === null ? null : placeName(doc, found)}
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
  place,
  values,
  media,
  pages,
}: {
  config: Block
  blockId: string
  blockPath: readonly Segment[]
  /** Where a Block in a Container is, to say so; null for any other. */
  place: string | null
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

  // A field marked as style (`STYLE`) goes under Style; the rest is content.
  const isStyle = (field: Field) =>
    (field as { custom?: { style?: unknown } }).custom?.style === true
  const style = config.fields.filter(isStyle)
  const content = config.fields.filter((field) => !isStyle(field))

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
        <div>
          <h2 className="text-sm font-semibold">{label}</h2>
          {place && <p className="text-xs text-muted-foreground">In {place}</p>}
        </div>
        {style.length === 0 ? (
          <FieldList fields={config.fields} path={[]} sibling={values} />
        ) : (
          // What the Block says, and how it looks: its background and text
          // colour, from the Theme (apps/site ADR-0013).
          <Tabs defaultValue="content" className="gap-4">
            <TabsList className="w-full">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
            </TabsList>
            <TabsContent
              value="content"
              aria-label="Content"
              className="flex flex-col gap-4"
            >
              {content.length > 0 ? (
                <FieldList fields={content} path={[]} sibling={values} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  This Block has no content of its own.
                </p>
              )}
            </TabsContent>
            <TabsContent
              value="style"
              aria-label="Style"
              className="flex flex-col gap-4"
            >
              <FieldList fields={style} path={[]} sibling={values} />
            </TabsContent>
          </Tabs>
        )}
      </form>
    </FieldsProvider>
  )
}
