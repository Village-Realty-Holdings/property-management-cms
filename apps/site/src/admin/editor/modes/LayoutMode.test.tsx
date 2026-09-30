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
import axe from "axe-core"
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
vi.mock("../../actions/pagePicker", () => ({
  searchPages: async () => [
    { id: 9, title: "Stays", path: "/stays", status: "published" },
  ],
}))
const success = vi.hoisted(() => vi.fn())
vi.mock("sonner", () => ({ toast: { success } }))

import type { PageBlock } from "../../../site/blocks/types"
import type {
  LayoutResult,
  LayoutScreen,
  LayoutVersionRow,
  PreviewPage,
} from "../../layouts/layoutScreen"
import { BRIDGE_CHANNEL } from "../bridge"
import type { LayoutDocument } from "../state"
import { LayoutMode, type LayoutModeActions } from "./LayoutMode"

const hero = (heading: string) =>
  ({ id: "p1", blockType: "hero", heading }) as PageBlock

const doc: LayoutDocument = {
  kind: "layout",
  name: "Main",
  paths: ["/stays"],
  isDefault: false,
  header: [
    { id: "h1", blockType: "utilityStrip", text: "Summer offers" },
  ] as unknown as LayoutDocument["header"],
  footer: [
    { id: "f1", blockType: "legalBar", text: "© {year}" },
  ] as unknown as LayoutDocument["footer"],
}

const version = (over: Partial<LayoutVersionRow>): LayoutVersionRow => ({
  id: 1,
  savedAt: "2026-03-01T10:00:00.000Z",
  when: "Mar 1, 2026, 10:00 AM UTC",
  author: "Sam Staff",
  summary: "Saved again",
  isLive: false,
  ...over,
})

const history = [
  version({ id: 3, isLive: true, summary: "Header changed" }),
  version({
    id: 2,
    when: "Mar 2, 2026, 9:00 AM UTC",
    summary: "Footer changed",
  }),
  version({ id: 1, author: null, summary: "Created" }),
]

const preview: PreviewPage = {
  id: 4,
  title: "Cabin",
  path: "/stays/cabin",
  blocks: [hero("Stay with us")],
}

const screenOf = (over: Partial<LayoutScreen> = {}): LayoutScreen => ({
  id: 7,
  doc,
  usedBy: 2,
  preview,
  history,
  pages: [],
  ...over,
})

let actions: {
  save: ReturnType<typeof vi.fn<LayoutModeActions["save"]>>
  restore: ReturnType<typeof vi.fn<LayoutModeActions["restore"]>>
  loadPage: ReturnType<typeof vi.fn<LayoutModeActions["loadPage"]>>
}

const saved = (over: Partial<LayoutResult> = {}): LayoutResult => ({
  ok: true,
  message: "Layout saved: 2 Pages changed.",
  doc,
  usedBy: 2,
  history,
  ...over,
})

function mount(over: Partial<LayoutScreen> = {}) {
  return render(<LayoutMode screen={screenOf(over)} actions={actions} />)
}

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})
beforeEach(() => {
  success.mockReset()
  for (const fn of Object.values(router)) fn.mockReset()
  actions = {
    save: vi.fn<LayoutModeActions["save"]>(async () => saved()),
    restore: vi.fn<LayoutModeActions["restore"]>(async () => saved()),
    loadPage: vi.fn<LayoutModeActions["loadPage"]>(async () => preview),
  }
  window.history.replaceState(null, "", "/admin/layouts/7")
})
afterEach(cleanup)

const bar = () => screen.getByRole("banner")
const frame = () => document.querySelector("iframe") as HTMLIFrameElement
const saveButton = () =>
  within(bar()).getByRole("button", { name: /^Save/ }) as HTMLButtonElement
const openTab = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string
) => {
  await user.click(screen.getByRole("tab", { name }))
  return screen.getByRole("tabpanel", { name })
}
const rename = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string
) => {
  const panel = await openTab(user, "Layout")
  const field = within(panel).getByLabelText("Name")
  await user.clear(field)
  await user.type(field, name)
}

describe("the top bar", () => {
  it("names the Layout, shows the Layout chip and how far a save reaches", () => {
    mount()
    expect(
      within(bar()).getByRole("heading", { name: "Main", level: 1 })
    ).toBeTruthy()
    expect(within(bar()).getByText("Layout")).toBeTruthy()
    expect(within(bar()).getByText("Used by 2 Pages")).toBeTruthy()
    expect(within(bar()).getByText("Goes live on 2 Pages")).toBeTruthy()
  })

  it("says Page, not Pages, for one", () => {
    mount({ usedBy: 1 })
    expect(within(bar()).getByText("Used by 1 Page")).toBeTruthy()
    expect(within(bar()).getByText("Goes live on 1 Page")).toBeTruthy()
  })

  it("has Save, and no Publish: a Layout has no Draft", () => {
    mount()
    expect(saveButton()).toBeTruthy()
    expect(within(bar()).queryByRole("button", { name: "Publish" })).toBeNull()
  })
})

describe("the panel", () => {
  it("has the Outline, Block, Layout and History tabs", () => {
    mount()
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Outline",
      "Block",
      "Layout",
      "History",
    ])
  })

  it("outlines the Header and Footer Blocks", () => {
    mount()
    const outline = screen.getByRole("tabpanel", { name: "Outline" })
    expect(within(outline).getAllByRole("treeitem")).toHaveLength(2)
  })

  it("opens the Block tab when a Block is chosen in the Outline", async () => {
    const user = userEvent.setup()
    mount()
    const outline = screen.getByRole("tabpanel", { name: "Outline" })
    await user.click(within(outline).getAllByRole("treeitem")[0]!)
    const block = screen.getByRole("tabpanel", { name: "Block" })
    expect(within(block).getByDisplayValue("Summer offers")).toBeTruthy()
  })
})

describe("the canvas", () => {
  /** The canvas announcing itself; returns what the Admin then posts to it. */
  function ready() {
    const post = vi.spyOn(frame().contentWindow!, "postMessage")
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { channel: BRIDGE_CHANNEL, type: "ready" },
          origin: window.location.origin,
          source: frame().contentWindow,
        })
      )
    })
    return () =>
      post.mock.calls.map(
        (call) => (call[0] as { document: Record<string, unknown> }).document
      )
  }

  it("shows the Layout around the Page it is previewed on, in Layout mode", () => {
    mount()
    const posted = ready()()
    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({
      mode: "layout",
      page: preview.blocks,
      header: doc.header,
      footer: doc.footer,
      theme: null,
    })
  })

  it("shows an edit in the Header at once, without a request", async () => {
    const user = userEvent.setup()
    mount()
    const posted = ready()
    const outline = screen.getByRole("tabpanel", { name: "Outline" })
    await user.click(within(outline).getAllByRole("treeitem")[0]!)
    const block = screen.getByRole("tabpanel", { name: "Block" })
    const field = within(block).getByDisplayValue("Summer offers")
    await user.type(field, "!")

    const last = posted().at(-1) as { header: { text?: string }[] }
    expect(last.header[0]?.text).toBe("Summer offers!")
    expect(actions.save).not.toHaveBeenCalled()
  })

  it("shows an empty Page when nothing is there to preview on", () => {
    mount({ preview: null })
    expect(ready()()[0]).toMatchObject({ mode: "layout", page: [] })
  })
})

describe("previewing on another Page", () => {
  it("loads the Page that Ctrl-K picks and shows the Layout around it", async () => {
    const user = userEvent.setup()
    const other: PreviewPage = {
      id: 9,
      title: "Stays",
      path: "/stays",
      blocks: [hero("All stays")],
    }
    actions.loadPage.mockResolvedValue(other)
    mount()
    const post = vi.spyOn(frame().contentWindow!, "postMessage")
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { channel: BRIDGE_CHANNEL, type: "ready" },
          origin: window.location.origin,
          source: frame().contentWindow,
        })
      )
    })

    await user.keyboard("{Control>}k{/Control}")
    await user.click(await screen.findByRole("option", { name: /Stays/ }))

    await waitFor(() => expect(actions.loadPage).toHaveBeenCalledWith(9))
    await waitFor(() => {
      const last = post.mock.calls.at(-1)?.[0] as {
        document: { page: unknown[] }
      }
      expect(last.document.page).toEqual(other.blocks)
    })
    const panel = await openTab(user, "Layout")
    expect(
      within(panel).getByText(/Shown around Stays \(\/stays\)/)
    ).toBeTruthy()
    // Choosing a Page to preview never leaves the Layout.
    expect(router.push).not.toHaveBeenCalled()
  })

  it("says so when the Page cannot be loaded, and keeps the last preview", async () => {
    const user = userEvent.setup()
    actions.loadPage.mockResolvedValue(null)
    mount()
    await user.keyboard("{Control>}k{/Control}")
    await user.click(await screen.findByRole("option", { name: /Stays/ }))
    const panel = await openTab(user, "Layout")
    expect(await within(panel).findByRole("alert")).toBeTruthy()
    expect(within(panel).getByText(/Shown around Cabin/)).toBeTruthy()
  })
})

describe("the Layout tab", () => {
  it("edits the name, and the top bar follows", async () => {
    const user = userEvent.setup()
    mount()
    await rename(user, "Listings")
    expect(
      within(bar()).getByRole("heading", { name: "Listings", level: 1 })
    ).toBeTruthy()
  })

  it("adds, edits and removes path prefixes", async () => {
    const user = userEvent.setup()
    mount()
    const panel = await openTab(user, "Layout")
    await user.click(within(panel).getByRole("button", { name: "Add path" }))
    const added = within(panel).getByLabelText("Path 2")
    await user.type(added, "/rentals")
    expect(
      (within(panel).getByLabelText("Path 1") as HTMLInputElement).value
    ).toBe("/stays")

    await user.click(
      within(panel).getByRole("button", { name: "Remove path 1" })
    )
    expect(within(panel).queryByLabelText("Path 2")).toBeNull()
    expect(
      (within(panel).getByLabelText("Path 1") as HTMLInputElement).value
    ).toBe("/rentals")
  })

  it("makes the Layout the default with the switch", async () => {
    const user = userEvent.setup()
    mount()
    const panel = await openTab(user, "Layout")
    const toggle = within(panel).getByRole("switch", {
      name: "Default Layout",
    })
    expect(toggle.getAttribute("aria-checked")).toBe("false")
    await user.click(toggle)
    expect(toggle.getAttribute("aria-checked")).toBe("true")
    await user.click(saveButton())
    expect(actions.save).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ isDefault: true })
    )
  })

  it("keeps the Site's default Layout the default, and says why", async () => {
    const user = userEvent.setup()
    mount({ doc: { ...doc, isDefault: true } })
    const panel = await openTab(user, "Layout")
    const toggle = within(panel).getByRole("switch", {
      name: "Default Layout",
    })
    expect(toggle.getAttribute("aria-checked")).toBe("true")
    expect(toggle.hasAttribute("data-disabled")).toBe(true)
    expect(
      within(panel).getByText(/make another Layout the default/)
    ).toBeTruthy()
  })

  it("asks for a name when it is blank", async () => {
    const user = userEvent.setup()
    mount()
    const panel = await openTab(user, "Layout")
    await user.clear(within(panel).getByLabelText("Name"))
    expect(within(panel).getByText("Give the Layout a name.")).toBeTruthy()
  })
})

describe("Save", () => {
  it("is off until something changes", async () => {
    const user = userEvent.setup()
    mount()
    expect(saveButton().disabled).toBe(true)
    await rename(user, "Listings")
    expect(saveButton().disabled).toBe(false)
  })

  it("saves the open Layout, says how many Pages changed and is done", async () => {
    const user = userEvent.setup()
    actions.save.mockImplementation(async (_id, sent) =>
      saved({ doc: sent, usedBy: 3, message: "Layout saved: 3 Pages changed." })
    )
    mount()
    await rename(user, "Listings")
    await user.click(saveButton())

    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Layout saved: 3 Pages changed.")
    )
    expect(actions.save).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ kind: "layout", name: "Listings" })
    )
    expect(saveButton().disabled).toBe(true)
    // What the save reached is what the bar says now.
    expect(within(bar()).getByText("Used by 3 Pages")).toBeTruthy()
  })

  it("fails inline, keeps the changes and stays on", async () => {
    const user = userEvent.setup()
    actions.save.mockResolvedValue({
      ok: false,
      message: "A path belongs to one Layout.",
    })
    mount()
    await rename(user, "Listings")
    await user.click(saveButton())

    expect(await within(bar()).findByRole("alert")).toHaveProperty(
      "textContent",
      "A path belongs to one Layout."
    )
    expect(success).not.toHaveBeenCalled()
    expect(saveButton().disabled).toBe(false)
  })

  it("fails inline when the request itself fails", async () => {
    const user = userEvent.setup()
    actions.save.mockRejectedValue(new Error("offline"))
    mount()
    await rename(user, "Listings")
    await user.click(saveButton())
    expect(await within(bar()).findByRole("alert")).toBeTruthy()
    expect(saveButton().disabled).toBe(false)
  })
})

describe("leaving with unsaved changes", () => {
  it("asks first, and Save in the dialog saves the Layout", async () => {
    const user = userEvent.setup()
    mount()
    await rename(user, "Listings")
    await user.click(within(bar()).getByRole("link", { name: /^Back/ }))
    const ask = await screen.findByRole("alertdialog")
    await user.click(within(ask).getByRole("button", { name: /^Save/ }))
    await waitFor(() => expect(actions.save).toHaveBeenCalledTimes(1))
  })
})

describe("the History tab", () => {
  it("lists the versions newest first, with when, who and what", async () => {
    const user = userEvent.setup()
    mount()
    const panel = await openTab(user, "History")
    const items = within(panel).getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(items[0]!.textContent).toContain("Header changed")
    expect(items[1]!.textContent).toContain("Footer changed")
    expect(items[1]!.textContent).toContain("Mar 2, 2026, 9:00 AM UTC")
    expect(items[1]!.textContent).toContain("Sam Staff")
  })

  it("offers Restore on every version but the live one", async () => {
    const user = userEvent.setup()
    mount()
    const panel = await openTab(user, "History")
    const items = within(panel).getAllByRole("listitem")
    expect(within(items[0]!).queryByRole("button")).toBeNull()
    expect(within(items[0]!).getByText("Live on your Site")).toBeTruthy()
    expect(
      within(items[1]!).getByRole("button", { name: /Restore/ })
    ).toBeTruthy()
    expect(
      within(items[2]!).getByRole("button", { name: /Restore/ })
    ).toBeTruthy()
  })

  it("asks before restoring, and restores nothing on Cancel", async () => {
    const user = userEvent.setup()
    mount()
    const panel = await openTab(user, "History")
    await user.click(
      within(within(panel).getAllByRole("listitem")[1]!).getByRole("button", {
        name: /Restore/,
      })
    )
    const confirm = await screen.findByRole("alertdialog")
    expect(confirm.textContent).toContain("Mar 2, 2026, 9:00 AM UTC")
    expect(confirm.textContent).toContain("2 Pages")
    await user.click(within(confirm).getByRole("button", { name: "Cancel" }))
    expect(actions.restore).not.toHaveBeenCalled()
  })

  it("restores the version, puts its content in the editor and says how many Pages changed", async () => {
    const user = userEvent.setup()
    const older: LayoutDocument = { ...doc, name: "Main (older)" }
    const newHistory = [
      version({ id: 4, isLive: true, summary: "Restored the version" }),
      ...history.map((v) => ({ ...v, isLive: false })),
    ]
    actions.restore.mockResolvedValue(
      saved({
        doc: older,
        message: "Version restored: 2 Pages changed.",
        history: newHistory,
      })
    )
    mount()
    const panel = await openTab(user, "History")
    await user.click(
      within(within(panel).getAllByRole("listitem")[1]!).getByRole("button", {
        name: /Restore/,
      })
    )
    const confirm = await screen.findByRole("alertdialog")
    await user.click(within(confirm).getByRole("button", { name: /Restore/ }))

    await waitFor(() => expect(actions.restore).toHaveBeenCalledWith(7, 2))
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Version restored: 2 Pages changed.")
    )
    expect(
      within(bar()).getByRole("heading", { name: "Main (older)", level: 1 })
    ).toBeTruthy()
    // The history grows, and the editor is clean: nothing to save.
    expect(within(panel).getAllByRole("listitem")).toHaveLength(4)
    expect(saveButton().disabled).toBe(true)
  })

  it("replaces unsaved changes when it restores, and warns first", async () => {
    const user = userEvent.setup()
    mount()
    await rename(user, "Scratch")
    const panel = await openTab(user, "History")
    await user.click(
      within(within(panel).getAllByRole("listitem")[1]!).getByRole("button", {
        name: /Restore/,
      })
    )
    const confirm = await screen.findByRole("alertdialog")
    expect(confirm.textContent).toContain("unsaved changes")
    await user.click(within(confirm).getByRole("button", { name: /Restore/ }))
    await waitFor(() => expect(actions.restore).toHaveBeenCalled())
    await waitFor(() => expect(saveButton().disabled).toBe(true))
    expect(
      within(bar()).getByRole("heading", { name: "Main", level: 1 })
    ).toBeTruthy()
  })

  it("keeps the dialog open and says why when a restore fails", async () => {
    const user = userEvent.setup()
    actions.restore.mockResolvedValue({
      ok: false,
      message: "That version no longer exists.",
    })
    mount()
    const panel = await openTab(user, "History")
    await user.click(
      within(within(panel).getAllByRole("listitem")[2]!).getByRole("button", {
        name: /Restore/,
      })
    )
    const confirm = await screen.findByRole("alertdialog")
    await user.click(within(confirm).getByRole("button", { name: /Restore/ }))
    expect(
      await within(confirm).findByText("That version no longer exists.")
    ).toBeTruthy()
    expect(success).not.toHaveBeenCalled()
  })

  it("says so when there are no versions", async () => {
    const user = userEvent.setup()
    mount({ history: [] })
    const panel = await openTab(user, "History")
    expect(within(panel).getByText(/No versions yet/)).toBeTruthy()
  })
})

describe("accessibility", () => {
  it.each(["Outline", "Block", "Layout", "History"])(
    "has no axe violations with the %s tab open",
    async (tab) => {
      const user = userEvent.setup()
      const { container } = mount()
      await openTab(user, tab)
      // The canvas is the Site, which has its own checks; jsdom can't enter it.
      const results = await axe.run(
        { include: [container], exclude: [["iframe"]] },
        {
          // jsdom has no layout or paint, so contrast is checked in the browser.
          rules: { "color-contrast": { enabled: false } },
          runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        }
      )
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    }
  )
})
