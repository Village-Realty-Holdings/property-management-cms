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
import { restorePageVersion, savePage } from "../../actions/pages"
import type { MediaOption } from "../../components/MediaSelect"
import { StatusChip } from "../../dashboard/StatusChip"
import type { PageStatus } from "../../dashboard/pageStatus"
import {
  InlineError,
  notify,
  StaleSaveDialog,
  useStaleSave,
  type Dependent,
  type SaveResult,
} from "../../kit"
import type { PageVersionRow } from "../../pageHistory"
import type { PageIntent } from "../../pageSave"
import type { Revision } from "../../staleSave"
import { BlockPanel } from "../BlockPanel"
import { canvasDocument } from "../bridge"
import { EditorProvider, useEditor } from "../EditorProvider"
import type { PageOption } from "../fields/context"
import { OutlinePanel } from "../OutlinePanel"
import type { PageDocument } from "../state"
import { useCanvasBridge } from "../useCanvasBridge"
import { VisualEditorShell } from "../VisualEditorShell"
import { PageHistoryTab } from "./PageHistoryTab"
import { PresenceBanner } from "../PresenceBanner"
import { usePresence } from "../usePresence"
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
   * The path visitors are served the Page at: its Published path, which the
   * Draft's can differ from. Null while the Page is not Published.
   */
  publishedPath: string | null
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
  /** The Page's saved versions, newest first; empty for a New Page. */
  history?: readonly PageVersionRow[]
  /**
   * The latest version when the editor opened, for the stale-save check; unset
   * for a New Page.
   */
  revision?: Revision | null
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
  history: "history",
} as const

function PageModeEditor({
  id,
  initial,
  status: initialStatus,
  publishedPath: initialPublishedPath,
  layouts: initialLayouts,
  initialTab,
  media,
  pages,
  dependents,
  canvasSrc,
  history: initialHistory = [],
  revision,
}: PageModeProps) {
  const { doc, state, isDirty, markSaved, discard } = useEditor()
  const stale = useStaleSave({ initial: revision, dirty: isDirty, discard })
  const router = useRouter()
  const page = doc.kind === "page" ? doc : initial

  const [pageId, setPageId] = useState(id)
  const [status, setStatus] = useState(initialStatus)
  const [publishedPath, setPublishedPath] = useState(initialPublishedPath)
  const [history, setHistory] = useState(initialHistory)
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

  // Saving is async and the User keeps typing: a save sends what was on
  // screen when it started, and reads the latest from these.
  const latest = useRef({ doc, pageId })
  useEffect(() => {
    latest.current = { doc, pageId }
  })
  const saving = useRef(false)
  // "Save anyway" calls the save and the restore again, as they are by then.
  const again = useRef<{
    save: (intent: PageIntent) => Promise<SaveResult>
    restore: (row: PageVersionRow) => Promise<SaveResult>
  } | null>(null)

  // Who else is editing this Page. A New Page has none until its first save.
  const presenceTarget = useMemo(
    () => (pageId === null ? null : ({ kind: "page", id: pageId } as const)),
    [pageId]
  )
  const presence = usePresence(presenceTarget)
  const refreshPresence = presence.refresh

  const save = useCallback(
    async (
      intent: PageIntent,
      { force = false }: { force?: boolean } = {}
    ): Promise<SaveResult> => {
      const { doc: current, pageId: currentId } = latest.current
      if (current.kind !== "page" || saving.current) return
      saving.current = true
      setBusy(intent)
      try {
        const result = await savePage({
          id: currentId,
          intent,
          document: current,
          expected: stale.expected(),
          ...(force ? { force: true } : {}),
        })
        // Someone saved since this was opened: the dialog decides what next.
        if (stale.settle(result, () => again.current!.save(intent))) {
          setProblem({ message: result.message! })
          return { ok: false, message: result.message }
        }
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
        // Payload cleared every hold on this Page with the write.
        refreshPresence()
        if (result.status) setStatus(result.status)
        // Publishing makes the saved path the live one; unpublishing leaves none.
        if (intent === "publish") setPublishedPath(result.document.path)
        else if (intent === "unpublish") setPublishedPath(null)
        if (result.history) setHistory(result.history)
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
    [markSaved, router, stale, refreshPresence]
  )

  // Restore replaces whatever was being edited with the old version, saved as
  // the Draft. The history and the status come back with it.
  const restore = useCallback(
    async (row: PageVersionRow, force = false): Promise<SaveResult> => {
      const { doc: current, pageId: currentId } = latest.current
      if (currentId === null) return
      if (saving.current) {
        return {
          ok: false,
          message: "Wait for the save to finish, then try again.",
        }
      }
      saving.current = true
      let result
      try {
        result = await restorePageVersion(currentId, row.id, {
          expected: stale.expected(),
          ...(force ? { force: true } : {}),
        })
      } finally {
        saving.current = false
      }
      // The History confirm closes; the dialog decides what next.
      if (stale.settle(result, () => again.current!.restore(row)))
        return undefined
      if (!result.ok || !result.document) {
        // Nothing of the old version reaches the editor, so name any field
        // that stopped it here, the way a failed Save does.
        const lines = saveProblemLines(
          {
            message: result.message || "Could not restore. Please try again.",
            fieldErrors: result.fieldErrors,
          },
          current.kind === "page" ? current : page
        )
        return { ok: false, message: lines.join(" ") }
      }
      const before = state.baseline
      discard()
      markSaved(result.document, before)
      // The restore is a write, so it cleared every hold on this Page too.
      refreshPresence()
      setProblem(null)
      if (result.status) setStatus(result.status)
      if (result.history) setHistory(result.history)
      notify.success(result.message || "Version restored")
      return { ok: true }
    },
    [state.baseline, discard, markSaved, page, stale, refreshPresence]
  )

  useEffect(() => {
    again.current = {
      save: (intent) => save(intent, { force: true }),
      restore: (row) => restore(row, true),
    }
  })

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
        notice={
          <PresenceBanner
            view={presence.view}
            kind="page"
            onTakeOver={presence.takeOver}
          />
        }
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
                publishedPath={publishedPath}
                layouts={layouts}
                layout={layout}
                media={media}
                dependents={dependents}
                problem={problem}
                stale={{ expected: stale.expected, settle: stale.settle }}
                busy={busy !== null}
                onUnpublish={() => void save("unpublish")}
                onDeleted={() => router.replace("/admin/pages")}
                onLayoutMade={(option) => {
                  setMade((current) => [...current, option])
                  // Making the Layout wrote to this Page.
                  refreshPresence()
                  // The Draft now differs from what is live.
                  setStatus((current) =>
                    current === "published" ? "changes" : current
                  )
                }}
              />
            ),
          },
          {
            id: TABS.history,
            label: "History",
            content: (
              <PageHistoryTab
                rows={history}
                dirty={isDirty}
                onRestore={(row) => restore(row)}
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
              disabled={
                busy !== null ||
                (status === "published" && !isDirty) ||
                // A Page Template stays off the Site.
                page.isTemplate === true
              }
              // Stays a keyboard stop while there is nothing to publish.
              focusableWhenDisabled
              className="aria-disabled:opacity-50"
              onClick={() => void save("publish")}
            >
              Publish
            </Button>
          </>
        }
      />
      <StaleSaveDialog {...stale.dialog} />
    </div>
  )
}
