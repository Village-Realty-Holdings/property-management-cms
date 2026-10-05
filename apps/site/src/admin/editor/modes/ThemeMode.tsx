"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

import type { AvailableFont } from "../../../fonts/available"
import {
  INPUT_LABELS,
  type ThemeInputKey,
  type ThemeInputs,
} from "../../../theme"
import { saveTheme } from "../../actions/theme"
import { loadPreviewPage } from "../../actions/themePreview"
import { ThemeHistory } from "../../components/ThemeHistory"
import {
  InlineError,
  notify,
  StaleSaveDialog,
  useStaleSave,
  type SaveResult,
} from "../../kit"
import type { Revision } from "../../staleSave"
import type { PreviewPage } from "../../theme/previewPage"
import type { HistoryRow } from "../../theme/themeScreen"
import { editingUrl } from "../../../site/editing/flag"
import { canvasDocument } from "../bridge"
import { EditorProvider, useEditor } from "../EditorProvider"
import type { PickerPage } from "../PagePicker"
import type { ThemeDocument } from "../state"
import { ThemeControls } from "../theme/ThemeControls"
import { PresenceBanner } from "../PresenceBanner"
import { usePresence } from "../usePresence"
import { useCanvasBridge } from "../useCanvasBridge"
import { VisualEditorShell } from "../VisualEditorShell"

/**
 * Theme mode (ADR-0004): the Theme in the Visual Editor, opened from Settings
 * › Theme. The panel holds the Theme controls (with the contrast warnings and
 * their one-click fixes) and History. Block editing is off: the canvas shows a
 * Page's saved Blocks to see the Theme on, and the User moves between
 * Pages with Ctrl-K while the unsaved Theme stays on every one of them, until
 * it is saved (live on every Published Page) or discarded.
 */
export function ThemeMode(props: {
  /** The Theme that is live on the Site now. */
  live: ThemeInputs
  /** The built-in quick picks and stored Fonts the Site has. */
  fonts: readonly AvailableFont[]
  history: readonly HistoryRow[]
  /** How many Pages a save reaches: every Published Page. */
  publishedPages: number
  /** Home, which the canvas starts on. */
  home: PreviewPage
  /** The latest version when the editor opened, for the stale-save check. */
  revision?: Revision | null
}) {
  return (
    <EditorProvider initial={{ kind: "theme", inputs: props.live }}>
      <ThemeModeBody {...props} />
    </EditorProvider>
  )
}

const THEME_PRESENCE = { kind: "theme" } as const

/** The Theme inputs whose value differs between `a` and `b`. */
function changedKeys(a: ThemeInputs, b: ThemeInputs): ThemeInputKey[] {
  return (Object.keys(INPUT_LABELS) as ThemeInputKey[]).filter(
    (key) => JSON.stringify(a[key]) !== JSON.stringify(b[key])
  )
}

/**
 * The shell's canvas iframe, found when it is needed. The shell owns the
 * iframe and the bridge only needs its window, so this is a ref that looks the
 * frame up each time it is read (it is the same element for the whole visit:
 * a new canvas Page changes its `src`).
 */
const canvasFrameRef = {
  get current(): HTMLIFrameElement | null {
    return document.querySelector<HTMLIFrameElement>(
      'main[aria-label="Canvas"] iframe'
    )
  },
}

function ThemeModeBody({
  live,
  fonts,
  history,
  publishedPages,
  home,
  revision,
}: {
  live: ThemeInputs
  fonts: readonly AvailableFont[]
  history: readonly HistoryRow[]
  publishedPages: number
  home: PreviewPage
  revision?: Revision | null
}) {
  const { state, doc, isDirty, setField, markSaved, discard } = useEditor()
  // The ref behind it moves on with every save and restore, so a router
  // refresh never needs to hand it a new one.
  const stale = useStaleSave({ initial: revision, dirty: isDirty, discard })
  const inputs = (doc as ThemeDocument).inputs
  // Who else is editing the Theme. A save or Restore clears every hold on it,
  // so this editor claims it again afterwards.
  const presence = usePresence(THEME_PRESENCE)

  // ── The canvas: the Page it stands on, with the unsaved Theme ────────────
  const [preview, setPreview] = useState(home)
  const [canvasSrc, setCanvasSrc] = useState(() => editingUrl(home.path))
  const latestPick = useRef(0)
  // What the User has unsaved now, for a pick that finishes later.
  const unsaved = useRef<ThemeInputs | undefined>(undefined)
  useEffect(() => {
    unsaved.current = isDirty ? inputs : undefined
  })

  const pickPage = async (picked: PickerPage) => {
    const pick = ++latestPick.current
    const next = await loadPreviewPage(picked.id).catch(() => null)
    // A slower answer to an earlier pick never replaces a later one, and a
    // Page that is gone leaves the canvas where it was.
    if (next && pick === latestPick.current) {
      setPreview(next)
      // The new canvas is drawn with the unsaved Theme from its first paint,
      // not with the live one until the Admin's first message reaches it.
      setCanvasSrc(editingUrl(next.path, unsaved.current))
    }
  }

  const canvas = useMemo(
    () =>
      canvasDocument(
        { kind: "theme", inputs },
        { page: preview.page, header: preview.header, footer: preview.footer }
      ),
    [inputs, preview]
  )
  useCanvasBridge(canvasFrameRef, canvas)

  // ── Editing ──────────────────────────────────────────────────────────────
  // One control is one field, so typing in it is one undo step. A preset or
  // a fix changes several at once and goes in as one step.
  const change = (next: ThemeInputs) => {
    const keys = changedKeys(inputs, next)
    if (keys.length === 1) setField(`inputs.${keys[0]}`, next[keys[0]!])
    else if (keys.length > 1) setField("inputs", next)
  }

  // The live Theme changed under the editor (a Restore): it is the new saved
  // Theme. Unsaved edits stay, and are now against it.
  const baseline = useRef(state.baseline)
  useEffect(() => {
    baseline.current = state.baseline
  })
  const liveKey = JSON.stringify(live)
  useEffect(() => {
    const saved = baseline.current as ThemeDocument
    if (JSON.stringify(saved.inputs) === liveKey) return
    markSaved({ kind: "theme", inputs: live }, saved)
    presence.refresh()
    // `live` is what `liveKey` says; only a change of the Theme should run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey])

  // ── Saving ───────────────────────────────────────────────────────────────
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const save = async ({ force = false } = {}): Promise<SaveResult> => {
    setSaving(true)
    setFailure(null)
    try {
      const sent = doc
      const result = await saveTheme(inputs, note.trim() || null, {
        expected: stale.expected(),
        ...(force ? { force: true } : {}),
      })
      // Someone saved since this was opened: the dialog decides what next.
      if (stale.settle(result, () => save({ force: true }))) {
        const message = result.message || "The Theme could not be saved."
        setFailure(message)
        return { ok: false, message }
      }
      if (result.ok) {
        markSaved(sent, sent)
        presence.refresh()
        setNote("")
        notify.success(result.message || "Theme saved")
      } else {
        setFailure(result.message || "The Theme could not be saved.")
      }
      return result
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <VisualEditorShell
        mode="theme"
        name="Theme"
        goesLiveOn={publishedPages}
        canvasSrc={canvasSrc}
        notice={
          <PresenceBanner
            view={presence.view}
            kind="theme"
            onTakeOver={presence.takeOver}
          />
        }
        onSave={() => save()}
        canSave={isDirty && !saving}
        onPickPage={pickPage}
        actions={
          <>
            {failure && <InlineError>{failure}</InlineError>}
            <label className="sr-only" htmlFor="theme-save-note">
              Note for History (optional)
            </label>
            <Input
              id="theme-save-note"
              value={note}
              maxLength={200}
              placeholder="Note (optional)"
              className="h-7 w-44 text-xs"
              onChange={(event) => setNote(event.target.value)}
            />
            <Button
              size="sm"
              disabled={!isDirty || saving}
              onClick={() => void save()}
            >
              Save
            </Button>
          </>
        }
        tabs={[
          {
            id: "controls",
            label: "Controls",
            content: (
              <div className="p-3">
                <ThemeControls value={inputs} onChange={change} fonts={fonts} />
              </div>
            ),
          },
          {
            id: "history",
            label: "History",
            content: (
              <div className="flex flex-col gap-3 p-3">
                <p className="text-sm text-muted-foreground">
                  Every save goes live on your Site at once and is kept here.
                  Restore an earlier version to put your Site back the way it
                  was.
                </p>
                <ThemeHistory
                  rows={history}
                  stale={{ expected: stale.expected, settle: stale.settle }}
                />
              </div>
            ),
          },
        ]}
      />
      <StaleSaveDialog {...stale.dialog} />
    </>
  )
}
