"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
// After a first save the editor moves to the saved Page's address: a save that
// redirects is not a "leave", so this is the plain router, not the guarded one.
// eslint-disable-next-line no-restricted-imports
import { useRouter } from "next/navigation"

import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"

import { pageBlocks } from "../../../blocks"
import type { FooterBlock, HeaderBlock } from "../../../site/regions/types"
import { savePage } from "../../actions/pages"
import type { MediaOption } from "../../components/MediaSelect"
import { StatusChip } from "../../dashboard/StatusChip"
import type { PageStatus } from "../../dashboard/pageStatus"
import { InlineError, notify, type Dependent, type SaveResult } from "../../kit"
import type { PageIntent } from "../../pageSave"
import { BlockPanel } from "../BlockPanel"
import { canvasDocument } from "../bridge"
import { EditorProvider, useEditor } from "../EditorProvider"
import type { PageOption } from "../fields/context"
import { OutlinePanel } from "../OutlinePanel"
import type { PageDocument } from "../state"
import { useCanvasBridge } from "../useCanvasBridge"
import { VisualEditorShell } from "../VisualEditorShell"
import { PageTab } from "./PageTab"
import { resolvePageLayout, type LayoutOption } from "./pageTabModel"
import { saveProblemLines, type SaveProblem } from "./saveProblem"

export type { LayoutOption, ResolvedLayout } from "./pageTabModel"

export type PageModeProps = {
  /** The Page's id; null for a New Page, which is not saved until its first Save. */
  id: number | null
  /** The Draft, as stored. */
  initial: PageDocument
  status: PageStatus
  /**
   * Every Layout, with its Blocks. The Page's own is found from its path and
   * choice as they are edited, and shown locked around the Page.
   */
  layouts: readonly LayoutOption[]
  /** The panel tab to open on; the SEO screen's links ask for "page". */
  initialTab?: "outline" | "block" | "page"
  /** The Media an image field can pick from. */
  media: readonly MediaOption[]
  /** The Pages a link field can pick from. */
  pages: readonly PageOption[]
  /** The Pages whose menus or buttons link to this one, for Delete's confirmation. */
  dependents: readonly Dependent[]
  /** The canvas: the Site route at the Page's path, in its editing mode. */
  canvasSrc: string
}

/**
 * Page mode of the Visual Editor: opens the Page's Draft in the shell.
 *
 *  - Save keeps the Draft; Publish makes it live (and saves what is on screen
 *    first, in the same step). Both toast on success and show failures inline.
 *  - The status chip is Draft, Published or "Changes not published", from the
 *    last save.
 *  - The Layout is drawn around the Page, locked; "Edit Layout" opens it in
 *    Layout mode, through the unsaved-changes guard. The Page tab picks which
 *    one, and can make a new one from it.
 *  - A New Page (`id` null) is edited unsaved until its first Save, which
 *    creates it and moves the editor to its address.
 */
export function PageMode(props: PageModeProps) {
  return (
    <EditorProvider initial={props.initial}>
      <PageModeEditor {...props} />
    </EditorProvider>
  )
}

const BUSY_LABEL: Record<PageIntent, string> = {
  draft: "Saving…",
  publish: "Publishing…",
  unpublish: "Unpublishing…",
}

const TABS = {
  outline: "outline",
  block: "block",
  page: "page",
} as const

function PageModeEditor({
  id,
  initial,
  status: initialStatus,
  layouts: initialLayouts,
  initialTab,
  media,
  pages,
  dependents,
  canvasSrc,
}: PageModeProps) {
  const { doc, isDirty, markSaved } = useEditor()
  const router = useRouter()
  const page = doc.kind === "page" ? doc : initial

  const [pageId, setPageId] = useState(id)
  const [status, setStatus] = useState(initialStatus)
  const [busy, setBusy] = useState<PageIntent | null>(null)
  const [problem, setProblem] = useState<SaveProblem | null>(null)
  const [tab, setTab] = useState<string>(initialTab ?? TABS.outline)
  // Layouts made from this Page in this session join the ones it can pick.
  const [made, setMade] = useState<readonly LayoutOption[]>([])
  const layouts = useMemo(
    () => [...initialLayouts, ...made],
    [initialLayouts, made]
  )
  const layout = useMemo(
    () => resolvePageLayout(layouts, page.path, page.layout),
    [layouts, page.path, page.layout]
  )

  // Saving is async and the Staff User keeps typing: a save sends what was on
  // screen when it started, and reads the latest from these.
  const latest = useRef({ doc, pageId })
  useEffect(() => {
    latest.current = { doc, pageId }
  })
  const saving = useRef(false)

  const save = useCallback(
    async (intent: PageIntent): Promise<SaveResult> => {
      const { doc: current, pageId: currentId } = latest.current
      if (current.kind !== "page" || saving.current) return
      saving.current = true
      setBusy(intent)
      try {
        const result = await savePage({
          id: currentId,
          intent,
          document: current,
        })
        if (!result.ok || !result.document || result.id === undefined) {
          const failure = {
            message: result.message || "Could not save. Please try again.",
            fieldErrors: result.fieldErrors,
          }
          setProblem(failure)
          return { ok: false, message: failure.message }
        }
        setProblem(null)
        markSaved(result.document, current)
        if (result.status) setStatus(result.status)
        notify.success(result.message || "Saved")
        if (currentId === null) {
          latest.current = { ...latest.current, pageId: result.id }
          setPageId(result.id)
          router.replace(`/admin/pages/${result.id}`)
        }
        return { ok: true, message: result.message }
      } catch {
        const failure = { message: "Could not save. Please try again." }
        setProblem(failure)
        return { ok: false, message: failure.message }
      } finally {
        saving.current = false
        setBusy(null)
      }
    },
    [markSaved, router]
  )

  // The canvas shows the document as it is now, with the Layout around it.
  const around = useMemo(
    () => ({
      page: [],
      header: (layout?.header ?? []) as unknown as HeaderBlock[],
      footer: (layout?.footer ?? []) as unknown as FooterBlock[],
    }),
    [layout]
  )
  const canvas = useMemo(() => canvasDocument(doc, around), [doc, around])
  const root = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement | null>(null)
  useEffect(() => {
    // The shell owns the iframe; it is found once it has mounted.
    frame.current = root.current?.querySelector("iframe") ?? null
  }, [])
  useCanvasBridge(frame, canvas)

  const lines = problem ? saveProblemLines(problem, page) : []

  return (
    <div ref={root} className="contents">
      <VisualEditorShell
        mode="page"
        name={page.title.trim() || "Untitled Page"}
        canvasSrc={canvasSrc}
        onSave={() => save("draft")}
        // Ctrl-S (Cmd-S) is the Save button: the same save, on the same terms.
        canSave={busy === null && (pageId === null || isDirty)}
        tab={tab}
        onTabChange={setTab}
        tabs={[
          {
            id: TABS.outline,
            label: "Outline",
            content: (
              <OutlinePanel
                inherited={
                  layout
                    ? { header: layout.header, footer: layout.footer }
                    : undefined
                }
                onSelectBlock={() => setTab(TABS.block)}
              />
            ),
          },
          {
            id: TABS.block,
            label: "Block",
            content: (
              <BlockPanel blocks={pageBlocks} media={media} pages={pages} />
            ),
          },
          {
            id: TABS.page,
            label: "Page",
            content: (
              <PageTab
                id={pageId}
                status={status}
                layouts={layouts}
                layout={layout}
                media={media}
                dependents={dependents}
                problem={problem}
                busy={busy !== null}
                onUnpublish={() => void save("unpublish")}
                onDeleted={() => router.replace("/admin/pages")}
                onLayoutMade={(option) => {
                  setMade((current) => [...current, option])
                  // The Draft now differs from what is live.
                  setStatus((current) =>
                    current === "published" ? "changes" : current
                  )
                }}
              />
            ),
          },
        ]}
        actions={
          <>
            {lines.length > 0 && (
              <InlineError className="max-w-md py-1 text-xs">
                {lines.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </InlineError>
            )}
            {busy ? (
              // The chip never claims a state the save has not reached yet.
              <Badge variant="outline" aria-live="polite">
                {BUSY_LABEL[busy]}
              </Badge>
            ) : (
              <StatusChip status={status} />
            )}
            {layout && (
              <Link
                href={`/admin/layouts/${layout.id}`}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Edit Layout
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null || (pageId !== null && !isDirty)}
              onClick={() => void save("draft")}
            >
              Save
            </Button>
            <Button
              size="sm"
              disabled={busy !== null || (status === "published" && !isDirty)}
              onClick={() => void save("publish")}
            >
              Publish
            </Button>
          </>
        }
      />
    </div>
  )
}
