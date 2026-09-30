"use client"

import { useMemo, useRef, useState, type RefObject } from "react"
import { SaveIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { footerBlocks, headerBlocks } from "../../../blocks/region"
import { editingUrl } from "../../../site/editing/flag"
import type { MediaOption } from "../../components/MediaSelect"
import { notify, type SaveResult } from "../../kit"
import type {
  LayoutResult,
  LayoutScreen,
  LayoutVersionRow,
  PreviewPage,
} from "../../layouts/layoutScreen"
import { BlockPanel } from "../BlockPanel"
import { canvasDocument } from "../bridge"
import { EditorProvider, useEditor } from "../EditorProvider"
import type { PanelTab } from "../LeftPanel"
import { OutlinePanel } from "../OutlinePanel"
import type { PickerPage } from "../PagePicker"
import type { EditorDocument, LayoutDocument } from "../state"
import { useCanvasBridge } from "../useCanvasBridge"
import { VisualEditorShell } from "../VisualEditorShell"
import { LayoutHistoryTab } from "./LayoutHistoryTab"
import { LayoutSettingsTab } from "./LayoutSettingsTab"

/** The Server Actions Layout mode talks to; passed in so a test can stand in. */
export type LayoutModeActions = {
  save: (id: number, doc: LayoutDocument) => Promise<LayoutResult>
  restore: (id: number, versionId: number) => Promise<LayoutResult>
  /** The Page, with its Blocks, that Ctrl-K picked to preview the Layout on. */
  loadPage: (pageId: number) => Promise<PreviewPage | null>
}

/** The Block configs the Layout's Blocks come from, for the Block tab. */
const REGION_BLOCKS = [...headerBlocks, ...footerBlocks]

const FAILED = "Could not save. Please try again."

/** The Site route in its editing mode. Any path is the canvas; the Admin posts what to draw. */
const CANVAS_SRC = editingUrl("/")

/**
 * Layout mode of the Visual Editor (apps/site ADR-0006): the Layout's Header
 * and Footer are edited on the canvas around a Page, and every Page that uses
 * the Layout changes the moment it is saved.
 *
 *  - The canvas shows the Layout around the first Page that uses it (or Home).
 *    Ctrl-K picks another Page to preview it on. The Page's content is dimmed
 *    and locked by the canvas itself.
 *  - Save is live immediately, and its toast says how many Pages changed. The
 *    top bar says how many ("Used by N Pages", "Goes live on N Pages").
 *  - The panel has the Outline and Block tabs for the Header and Footer, the
 *    Layout tab (name, paths, default) and History with Restore.
 */
export function LayoutMode({
  screen,
  media = [],
  actions,
}: {
  screen: LayoutScreen
  media?: readonly MediaOption[]
  actions: LayoutModeActions
}) {
  return (
    // A different Layout is a new editor: nothing carries over.
    <EditorProvider key={screen.id} initial={screen.doc}>
      <LayoutModeBody screen={screen} media={media} actions={actions} />
    </EditorProvider>
  )
}

function LayoutModeBody({
  screen,
  media,
  actions,
}: {
  screen: LayoutScreen
  media: readonly MediaOption[]
  actions: LayoutModeActions
}) {
  const { doc, state, isDirty, markSaved, discard } = useEditor()
  const [tab, setTab] = useState("outline")
  const [usedBy, setUsedBy] = useState(screen.usedBy)
  const [history, setHistory] = useState<LayoutVersionRow[]>(screen.history)
  const [preview, setPreview] = useState<PreviewPage | null>(screen.preview)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // The shell draws the canvas and does not hand out its iframe, so it is
  // found inside the wrapper when the bridge needs it.
  const wrapper = useRef<HTMLDivElement>(null)
  const frame = useMemo(
    () =>
      ({
        get current() {
          return wrapper.current?.querySelector("iframe") ?? null
        },
      }) as RefObject<HTMLIFrameElement | null>,
    []
  )
  const canvas = useMemo(
    () =>
      canvasDocument(doc, {
        page: preview?.blocks ?? [],
        header: [],
        footer: [],
      }),
    [doc, preview]
  )
  useCanvasBridge(frame, canvas)

  if (doc.kind !== "layout") throw new Error("Layout mode edits a Layout.")

  /** What a write brought back: the stored Layout, its reach and its history. */
  function apply(result: LayoutResult) {
    if (result.usedBy !== undefined) setUsedBy(result.usedBy)
    if (result.history) setHistory(result.history)
  }

  const save = async (): Promise<SaveResult> => {
    const sent: EditorDocument = doc
    setSaving(true)
    setSaveError(null)
    try {
      const result = await actions.save(screen.id, doc)
      if (!result.ok || !result.doc) {
        const message = failureText(result)
        setSaveError(message)
        return { ok: false, message }
      }
      markSaved(result.doc, sent)
      apply(result)
      notify.success(result.message || "Layout saved")
      return { ok: true }
    } catch {
      setSaveError(FAILED)
      return { ok: false, message: FAILED }
    } finally {
      setSaving(false)
    }
  }

  const restore = async (row: LayoutVersionRow) => {
    const result = await actions.restore(screen.id, row.id)
    if (!result.ok || !result.doc) {
      return { ok: false, message: failureText(result) }
    }
    // The restored Layout replaces whatever was being edited, history and all.
    const before = state.baseline
    discard()
    markSaved(result.doc, before)
    apply(result)
    notify.success(result.message || "Version restored")
    return { ok: true }
  }

  async function pickPage(page: PickerPage) {
    setPreviewError(null)
    try {
      const loaded = await actions.loadPage(page.id)
      if (loaded) setPreview(loaded)
      else setPreviewError(`Could not show ${page.title}: it no longer exists.`)
    } catch {
      setPreviewError(`Could not show ${page.title}. Please try again.`)
    }
  }

  const tabs: PanelTab[] = [
    {
      id: "outline",
      label: "Outline",
      content: <OutlinePanel onSelectBlock={() => setTab("block")} />,
    },
    {
      id: "block",
      label: "Block",
      content: (
        <BlockPanel blocks={REGION_BLOCKS} media={media} pages={screen.pages} />
      ),
    },
    {
      id: "layout",
      label: "Layout",
      content: (
        <LayoutSettingsTab preview={preview} previewError={previewError} />
      ),
    },
    {
      id: "history",
      label: "History",
      content: (
        <LayoutHistoryTab
          rows={history}
          usedBy={usedBy}
          dirty={isDirty}
          onRestore={restore}
        />
      ),
    },
  ]

  return (
    <div ref={wrapper} className="contents">
      <VisualEditorShell
        mode="layout"
        name={doc.name.trim() || "Untitled Layout"}
        usedBy={usedBy}
        goesLiveOn={usedBy}
        tabs={tabs}
        tab={tab}
        onTabChange={setTab}
        canvasSrc={CANVAS_SRC}
        onSave={save}
        onPickPage={pickPage}
        actions={
          <>
            {saveError && (
              <p role="alert" className="max-w-[28ch] text-xs text-destructive">
                {saveError}
              </p>
            )}
            <Button
              type="button"
              size="sm"
              disabled={!isDirty || saving}
              onClick={() => void save()}
            >
              <SaveIcon aria-hidden />
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      />
    </div>
  )
}

/** The failure to show: the message, and the fields Payload named. */
function failureText(result: LayoutResult): string {
  const fields = Object.entries(result.fieldErrors ?? {})
    .map(([path, message]) => `${path}: ${message}`)
    .join("; ")
  const message = result.message || FAILED
  return fields ? `${message} ${fields}` : message
}
