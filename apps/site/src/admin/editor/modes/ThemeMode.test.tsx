// @vitest-environment jsdom
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

const actions = vi.hoisted(() => ({
  saveTheme: vi.fn(),
  restoreTheme: vi.fn(),
  loadPreviewPage: vi.fn(),
  searchPages: vi.fn(),
}))
vi.mock("../../actions/theme", () => ({
  saveTheme: actions.saveTheme,
  restoreTheme: actions.restoreTheme,
}))
vi.mock("../../actions/themePreview", () => ({
  loadPreviewPage: actions.loadPreviewPage,
}))
vi.mock("../../actions/pagePicker", () => ({
  searchPages: actions.searchPages,
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

import { combineFonts } from "../../../fonts/available"
import type { PageBlock } from "../../../site/blocks/types"
import { readThemeParam } from "../../../site/editing/flag"
import { DEFAULT_INPUTS, HARBOUR, type ThemeInputs } from "../../../theme"
import type { PreviewPage } from "../../theme/previewPage"
import type { HistoryRow } from "../../theme/themeScreen"
import { BRIDGE_CHANNEL } from "../bridge"
import { ThemeMode } from "./ThemeMode"

const hero = (heading: string) =>
  ({ id: "b1", blockType: "hero", heading }) as PageBlock

const home: PreviewPage = {
  path: "/",
  page: [hero("Welcome")],
  header: [],
  footer: [],
}
const stays: PreviewPage = {
  path: "/stays",
  page: [hero("Stays")],
  header: [],
  footer: [],
}

const version = (id: number, over: Partial<HistoryRow> = {}): HistoryRow => ({
  id,
  savedAt: "2026-03-02T09:00:00.000Z",
  when: "Mar 2, 2026, 9:00 AM UTC",
  author: "Ada",
  summary: "Primary colour",
  isLive: false,
  missingFonts: [],
  substitutions: [],
  ...over,
})
const history = [version(2, { isLive: true }), version(1)]

function mount(props: Partial<Parameters<typeof ThemeMode>[0]> = {}) {
  return render(
    <ThemeMode
      live={DEFAULT_INPUTS}
      fonts={combineFonts([])}
      history={history}
      publishedPages={3}
      home={home}
      {...props}
    />
  )
}

beforeAll(() => {
  // The Page picker's command list measures itself.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})
beforeEach(() => {
  for (const fn of [...Object.values(router), ...Object.values(actions)]) {
    fn.mockReset()
  }
  toast.success.mockReset()
  actions.searchPages.mockResolvedValue([
    { id: 9, title: "Stays", path: "/stays", status: "published" },
  ])
  actions.loadPreviewPage.mockResolvedValue(stays)
  actions.saveTheme.mockResolvedValue({ ok: true, message: "Theme saved." })
  window.history.replaceState(null, "", "/admin/theme")
})
afterEach(cleanup)

const bar = () => screen.getByRole("banner")
const frame = () => screen.getByTitle(/Theme/) as HTMLIFrameElement
const primary = () =>
  screen.getByRole<HTMLInputElement>("textbox", { name: "Primary colour" })
const saveButton = () => within(bar()).getByRole("button", { name: "Save" })

/** The documents the canvas was sent, oldest first. */
let sent: ReturnType<typeof vi.spyOn>
function spyOnCanvas() {
  sent = vi.spyOn(frame().contentWindow!, "postMessage")
}
function canvasReady() {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { channel: BRIDGE_CHANNEL, type: "ready" },
        origin: window.location.origin,
        source: frame().contentWindow,
      })
    )
  })
}
const lastDocument = () =>
  (sent.mock.calls.at(-1)![0] as { document: Record<string, unknown> }).document

async function setPrimary(
  user: ReturnType<typeof userEvent.setup>,
  hex: string
) {
  await user.clear(primary())
  await user.type(primary(), hex)
}

describe("opening Theme mode", () => {
  it("names the mode, says how many Pages a save reaches, and has no Block tab", () => {
    mount()
    expect(within(bar()).getByText("Theme", { selector: "span" })).toBeTruthy()
    expect(within(bar()).getByText("Goes live on 3 Pages")).toBeTruthy()
    expect(screen.queryByRole("tab", { name: "Block" })).toBeNull()
    expect(screen.queryByRole("tab", { name: "Outline" })).toBeNull()
  })

  it("holds the Theme controls and the contrast warnings", () => {
    mount()
    for (const name of [
      "Presets",
      "Colours",
      "Fonts",
      "Type",
      "Corners",
      "Spacing",
      "Shadows",
      "Buttons",
      "Motion",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeTruthy()
    }
    expect(primary().value).toBe(DEFAULT_INPUTS.primary)
  })

  it("puts the canvas on Home, in its editing mode", () => {
    mount()
    expect(frame().getAttribute("src")).toBe("/?__edit=1")
  })

  it("shows the Theme's History in its own tab, newest first", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("tab", { name: "History" }))
    const list = screen.getByRole("list", { name: /versions/i })
    expect(within(list).getAllByRole("listitem")).toHaveLength(2)
    expect(
      within(list).getByRole("button", { name: /Restore the version/ })
    ).toBeTruthy()
  })
})

describe("previewing", () => {
  it("sends the unsaved Theme to the canvas, with Home's Blocks, in theme mode", async () => {
    const user = userEvent.setup()
    mount()
    spyOnCanvas()
    canvasReady()
    expect(lastDocument()).toMatchObject({
      mode: "theme",
      page: [{ blockType: "hero", heading: "Welcome" }],
      theme: DEFAULT_INPUTS,
    })

    await setPrimary(user, "#8a1f5c")
    expect(lastDocument()).toMatchObject({
      mode: "theme",
      theme: { ...DEFAULT_INPUTS, primary: "#8a1f5c" },
    })
    expect(actions.saveTheme).not.toHaveBeenCalled()
  })

  it("applies a whole preset in one step", async () => {
    const user = userEvent.setup()
    mount()
    spyOnCanvas()
    canvasReady()
    await user.click(screen.getByRole("button", { name: "Harbour" }))
    expect(lastDocument().theme).toEqual(HARBOUR.inputs)

    await user.click(within(bar()).getByRole("button", { name: "Undo" }))
    expect(lastDocument().theme).toEqual(DEFAULT_INPUTS)
  })

  it("keeps the unsaved Theme when another Page is picked with Ctrl-K", async () => {
    const user = userEvent.setup()
    mount()
    spyOnCanvas()
    canvasReady()
    await setPrimary(user, "#8a1f5c")

    await user.keyboard("{Control>}k{/Control}")
    const dialog = await screen.findByRole("dialog", { name: /Page/ })
    await user.click(
      await within(dialog).findByRole("option", { name: /Stays/ })
    )

    await waitFor(() =>
      expect(frame().getAttribute("src")).toMatch(/^\/stays\?__edit=1/)
    )
    // The new canvas is drawn with the unsaved Theme from its first paint.
    const src = new URL(frame().getAttribute("src") ?? "", "http://admin")
    expect(readThemeParam(Object.fromEntries(src.searchParams))).toMatchObject({
      primary: "#8a1f5c",
    })
    expect(actions.loadPreviewPage).toHaveBeenCalledWith(9)
    // Nothing navigates: the editor stays on /admin/theme.
    expect(router.push).not.toHaveBeenCalled()
    expect(primary().value).toBe("#8a1f5c")

    // The new canvas (a new window) announces itself and gets the next Page
    // with the same Theme.
    spyOnCanvas()
    canvasReady()
    expect(lastDocument()).toMatchObject({
      mode: "theme",
      page: [{ heading: "Stays" }],
      theme: { primary: "#8a1f5c" },
    })
    expect(
      within(bar()).getByRole<HTMLButtonElement>("button", { name: "Discard" })
        .disabled
    ).toBe(false)
  })

  it("stays on the current Page when the picked one is gone", async () => {
    actions.loadPreviewPage.mockResolvedValue(null)
    const user = userEvent.setup()
    mount()
    await user.keyboard("{Control>}k{/Control}")
    const dialog = await screen.findByRole("dialog", { name: /Page/ })
    await user.click(
      await within(dialog).findByRole("option", { name: /Stays/ })
    )
    await waitFor(() => expect(actions.loadPreviewPage).toHaveBeenCalled())
    expect(frame().getAttribute("src")).toBe("/?__edit=1")
  })

  it("never lets a slow answer for an earlier pick win over a later one", async () => {
    let late!: (page: PreviewPage | null) => void
    actions.loadPreviewPage
      .mockImplementationOnce(() => new Promise((resolve) => (late = resolve)))
      .mockResolvedValueOnce({ ...stays, path: "/about" })
    actions.searchPages.mockResolvedValue([
      { id: 9, title: "Stays", path: "/stays", status: "published" },
      { id: 4, title: "About", path: "/about", status: "published" },
    ])
    const user = userEvent.setup()
    mount()
    for (const name of [/Stays/, /About/]) {
      await user.keyboard("{Control>}k{/Control}")
      const dialog = await screen.findByRole("dialog", { name: /Page/ })
      await user.click(await within(dialog).findByRole("option", { name }))
    }
    await waitFor(() =>
      expect(frame().getAttribute("src")).toBe("/about?__edit=1")
    )
    await act(async () => late(stays))
    expect(frame().getAttribute("src")).toBe("/about?__edit=1")
  })
})

describe("discarding", () => {
  it("puts the controls and the canvas back to the saved Theme", async () => {
    const user = userEvent.setup()
    mount()
    spyOnCanvas()
    canvasReady()
    await setPrimary(user, "#8a1f5c")

    await user.click(within(bar()).getByRole("button", { name: "Discard" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(
      within(dialog).getByRole("button", { name: "Discard changes" })
    )
    await waitFor(() => expect(primary().value).toBe(DEFAULT_INPUTS.primary))
    expect(lastDocument().theme).toEqual(DEFAULT_INPUTS)
    expect(actions.saveTheme).not.toHaveBeenCalled()
  })
})

describe("saving", () => {
  it("is off until the Theme has changed", async () => {
    const user = userEvent.setup()
    mount()
    expect(saveButton().hasAttribute("disabled")).toBe(true)
    await setPrimary(user, "#8a1f5c")
    expect(saveButton().hasAttribute("disabled")).toBe(false)
  })

  it("saves the unsaved Theme, with the note, toasts, and is clean again", async () => {
    const user = userEvent.setup()
    mount()
    await setPrimary(user, "#8a1f5c")
    await user.type(
      within(bar()).getByRole("textbox", { name: /Note/ }),
      "  Warmer  "
    )
    await user.click(saveButton())

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Theme saved.")
    )
    expect(actions.saveTheme).toHaveBeenCalledWith(
      { ...DEFAULT_INPUTS, primary: "#8a1f5c" },
      "Warmer"
    )
    await waitFor(() =>
      expect(saveButton().hasAttribute("disabled")).toBe(true)
    )
    expect(primary().value).toBe("#8a1f5c")
    expect(
      within(bar()).getByRole<HTMLInputElement>("textbox", { name: /Note/ })
        .value
    ).toBe("")
  })

  it("saves with no note when none is written", async () => {
    const user = userEvent.setup()
    mount()
    await setPrimary(user, "#8a1f5c")
    await user.click(saveButton())
    await waitFor(() => expect(actions.saveTheme).toHaveBeenCalled())
    expect(actions.saveTheme.mock.calls[0]![1]).toBeNull()
  })

  it("says why a save failed, keeps the changes, and does not toast", async () => {
    actions.saveTheme.mockResolvedValue({
      ok: false,
      message: "Some fields need attention.",
    })
    const user = userEvent.setup()
    mount()
    await setPrimary(user, "#8a1f5c")
    await user.click(saveButton())

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Some fields need attention.")
    )
    expect(toast.success).not.toHaveBeenCalled()
    expect(primary().value).toBe("#8a1f5c")
    expect(saveButton().hasAttribute("disabled")).toBe(false)
  })
})

describe("the live Theme changing under the editor", () => {
  it("follows a restore when nothing is unsaved", () => {
    const { rerender } = mount()
    rerender(
      <ThemeMode
        live={HARBOUR.inputs}
        fonts={combineFonts([])}
        history={history}
        publishedPages={3}
        home={home}
      />
    )
    expect(primary().value).toBe(HARBOUR.inputs.primary)
    expect(saveButton().hasAttribute("disabled")).toBe(true)
  })

  it("keeps unsaved edits, which are then against the restored Theme", async () => {
    const user = userEvent.setup()
    const { rerender } = mount()
    await setPrimary(user, "#8a1f5c")
    const restored: ThemeInputs = { ...HARBOUR.inputs }
    rerender(
      <ThemeMode
        live={restored}
        fonts={combineFonts([])}
        history={history}
        publishedPages={3}
        home={home}
      />
    )
    expect(primary().value).toBe("#8a1f5c")
    expect(saveButton().hasAttribute("disabled")).toBe(false)
  })
})
