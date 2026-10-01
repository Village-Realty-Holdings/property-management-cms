"use client"

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"
// The Visual Editor shell passes `onPick` built on the guarded router. This
// plain router is only the default for a picker used outside an editor.
// eslint-disable-next-line no-restricted-imports
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"

import { searchPages } from "../actions/pagePicker"
import type { PageRow } from "../dashboard/rows"
import { StatusChip } from "../dashboard/StatusChip"

/** What the picker knows about a Page: enough to find it and to open it. */
export type PickerPage = Pick<PageRow, "id" | "title" | "path" | "status">

/** How long typing pauses before the search goes to the server. */
const TYPING_PAUSE_MS = 150

/** What the screen shows: `pages` is the answer to the search for `query`. */
type Results = {
  state: "loading" | "done" | "failed"
  pages: PickerPage[]
  query: string
}

/**
 * Searches Pages by title and path while `open`. Keeps the previous answer on
 * screen while the next one loads, and only ever shows the answer to the
 * latest search.
 */
function usePageSearch(
  open: boolean,
  query: string,
  onAnswer: (pages: PickerPage[]) => void
): Results {
  const answered = useRef(onAnswer)
  useEffect(() => {
    answered.current = onAnswer
  })
  const [results, setResults] = useState<Results>({
    state: "loading",
    pages: [],
    query: "",
  })

  useEffect(() => {
    if (!open) return
    let current = true
    // Opening searches at once; typing waits for a pause.
    const wait = query === "" ? 0 : TYPING_PAUSE_MS
    const timer = setTimeout(() => {
      setResults((previous) => ({ ...previous, state: "loading" }))
      searchPages(query).then(
        (pages) => {
          if (!current) return
          setResults({ state: "done", pages, query })
          answered.current(pages)
        },
        () => {
          if (!current) return
          setResults({ state: "failed", pages: [], query })
          answered.current([])
        }
      )
    }, wait)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [open, query])

  return results
}

function isPickerShortcut(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "k"
  )
}

/**
 * The Ctrl-K Page picker: a top bar button, and the Ctrl-K / Cmd-K shortcut,
 * that open a command dialog searching Pages by title and path (a Draft's
 * title included, with its status).
 *
 * `onPick` says what choosing a Page does. By default the Page opens in the
 * Visual Editor (`/admin/pages/<id>`); Layout mode previews that Page, and
 * Theme mode switches the canvas Page keeping the unsaved inputs.
 */
export function PagePicker({
  onPick,
  open: controlledOpen,
  onOpenChange,
}: {
  onPick?: (page: PickerPage) => void
  /**
   * Whether the picker is open, when its owner controls that. The Visual
   * Editor does, so its shortcut hook can open it from the keyboard, and from
   * a key forwarded by the canvas; the Ctrl-K listener here is then off.
   */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const controlled = controlledOpen !== undefined
  const [ownOpen, setOwnOpen] = useState(false)
  const open = controlled ? controlledOpen : ownOpen
  const setOpen = (next: boolean) => {
    if (!controlled) setOwnOpen(next)
    onOpenChange?.(next)
  }
  const [query, setQuery] = useState("")
  const [highlighted, setHighlighted] = useState("")
  // An Enter pressed before the answer is in: it picks the top match once it is.
  const enterWaiting = useRef(false)
  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setQuery("")
      enterWaiting.current = false
    }
  }

  const pick = (page: PickerPage) => {
    changeOpen(false)
    if (onPick) onPick(page)
    else router.push(`/admin/pages/${page.id}`)
  }

  const results = usePageSearch(open, query, (answer) => {
    if (!enterWaiting.current) return
    enterWaiting.current = false
    if (answer[0]) pick(answer[0])
  })
  // The list on screen answers what is typed now, and is not still loading.
  const settled = results.state !== "loading" && results.query === query

  useEffect(() => {
    if (controlled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPickerShortcut(event)) return
      // Not the browser's own Ctrl-K (focus the address bar / search).
      event.preventDefault()
      setOwnOpen(true)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [controlled])

  const { state, pages } = results
  // Enter picks the highlighted Page, so it must always be one on screen: the
  // first, when the answer to a new search leaves the old highlight out.
  const current = pages.some((page) => String(page.id) === highlighted)
    ? highlighted
    : String(pages[0]?.id ?? "")
  // Enter must pick a Page that answers what was typed, never one left on
  // screen from the search before it: it waits for the answer instead.
  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || settled)
      return
    event.preventDefault()
    enterWaiting.current = true
  }
  const showMessage = state === "failed" || pages.length === 0

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => setOpen(true)}
      >
        Pages{" "}
        <kbd className="rounded border border-border px-1 font-mono text-xs">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={changeOpen}
        // No fade or zoom: see BlockPicker.
        className="duration-0"
        title="Go to a Page"
        description="Search Pages by title or path, then press Enter to open one."
      >
        {/* The server does the matching, so cmdk must not filter again. */}
        <Command
          shouldFilter={false}
          value={current}
          onValueChange={setHighlighted}
          onKeyDown={onKeyDown}
        >
          <CommandInput
            value={query}
            onValueChange={(next) => {
              enterWaiting.current = false
              setQuery(next)
            }}
            placeholder="Search Pages by title or path"
          />
          <CommandList aria-busy={state === "loading"}>
            {pages.length > 0 && (
              <CommandGroup heading="Pages">
                {pages.map((page) => (
                  <CommandItem
                    key={page.id}
                    value={String(page.id)}
                    onSelect={() => pick(page)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {page.title}
                      </span>
                      <span className="block truncate text-xs text-foreground/70">
                        {page.path}
                      </span>
                    </span>
                    <StatusChip status={page.status} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <div aria-live="polite" className="text-center text-sm">
            {state === "failed" ? (
              <p role="alert" className="py-6 text-destructive">
                The Pages could not be searched. Try again.
              </p>
            ) : showMessage ? (
              <p className="py-6 text-muted-foreground">
                {state === "loading"
                  ? "Searching…"
                  : query.trim()
                    ? "No Pages match."
                    : "There are no Pages yet."}
              </p>
            ) : null}
          </div>
        </Command>
      </CommandDialog>
    </>
  )
}
