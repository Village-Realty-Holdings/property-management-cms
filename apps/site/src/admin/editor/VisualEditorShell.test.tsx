// @vitest-environment jsdom
import {
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
vi.mock("../actions/pagePicker", () => ({
  searchPages: async () => [
    { id: 9, title: "Stays", path: "/stays", status: "published" },
  ],
}))

import { EditorProvider, useEditor } from "./EditorProvider"
import type { EditorDocument } from "./state"
import { VisualEditorShell } from "./VisualEditorShell"

const page: EditorDocument = {
  kind: "page",
  title: "Home",
  path: "/",
  layout: { mode: "default" },
  blocks: [],
  seo: { title: "", description: "", image: null },
}

const tabs = [
  { id: "outline", label: "Outline", content: <p>Outline content</p> },
  { id: "block", label: "Block", content: <p>Block content</p> },
  { id: "page", label: "Page", content: <p>Page content</p> },
]

/** Stands in for the panels: makes an edit, and shows the title. */
function Probe() {
  const { setField, doc } = useEditor()
  return (
    <>
      <button type="button" onClick={() => setField("title", "About")}>
        Make an edit
      </button>
      <output aria-label="title now">{(doc as { title: string }).title}</output>
    </>
  )
}

function mount(props: Partial<Parameters<typeof VisualEditorShell>[0]> = {}) {
  return render(
    <EditorProvider initial={page}>
      <VisualEditorShell
        mode="page"
        name="Home"
        tabs={tabs}
        canvasSrc="/"
        actions={<button type="button">Publish</button>}
        {...props}
      />
      <Probe />
    </EditorProvider>
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
  for (const fn of Object.values(router)) fn.mockReset()
  window.history.replaceState(null, "", "/admin/pages/1")
})
afterEach(cleanup)

const bar = () => screen.getByRole("banner")
const frame = () => screen.getByTitle(/Home/) as HTMLIFrameElement
const titleNow = () => screen.getByLabelText("title now").textContent
const isDisabled = (el: HTMLElement) => (el as HTMLButtonElement).disabled

describe("the top bar", () => {
  it("shows Back, the document name, the mode chip and the actions", () => {
    mount()
    expect(within(bar()).getByRole("link", { name: /^Back/ })).toBeTruthy()
    expect(
      within(bar()).getByRole("heading", { name: "Home", level: 1 })
    ).toBeTruthy()
    expect(within(bar()).getByText("Page")).toBeTruthy()
    expect(within(bar()).getByRole("button", { name: "Publish" })).toBeTruthy()
    expect(within(bar()).queryByText(/Used by/)).toBeNull()
  })

  it.each([
    ["layout", "Layout"],
    ["theme", "Theme"],
  ] as const)("names %s mode in the chip", (mode, label) => {
    mount({ mode })
    expect(within(bar()).getByText(label)).toBeTruthy()
  })

  it("says how many Pages use a Layout, in Layout mode", () => {
    const { unmount } = mount({ mode: "layout", usedBy: 3 })
    expect(within(bar()).getByText("Used by 3 Pages")).toBeTruthy()
    unmount()
    mount({ mode: "layout", usedBy: 1 })
    expect(within(bar()).getByText("Used by 1 Page")).toBeTruthy()
  })

  it("does not say Used by outside Layout mode", () => {
    mount({ mode: "page", usedBy: 3 })
    expect(within(bar()).queryByText(/Used by/)).toBeNull()
  })

  it("says how far a save reaches when told", () => {
    mount({ mode: "layout", goesLiveOn: 2 })
    expect(within(bar()).getByText("Goes live on 2 Pages")).toBeTruthy()
  })

  it("has the Page picker's button, which opens the picker", async () => {
    const user = userEvent.setup()
    mount()
    const button = within(bar()).getByRole("button", {
      name: /Pages\s+Ctrl K/,
    })
    expect(isDisabled(button)).toBe(false)
    await user.click(button)
    expect(await screen.findByRole("dialog", { name: /Page/ })).toBeTruthy()
  })
})

describe("undo, redo and discard", () => {
  it("are off while there is nothing to undo, redo or discard", () => {
    mount()
    for (const name of ["Undo", "Redo", "Discard"]) {
      expect(isDisabled(within(bar()).getByRole("button", { name }))).toBe(true)
    }
  })

  it("undo and redo act on the document", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("button", { name: "Make an edit" }))
    expect(titleNow()).toBe("About")

    await user.click(within(bar()).getByRole("button", { name: "Undo" }))
    expect(titleNow()).toBe("Home")

    await user.click(within(bar()).getByRole("button", { name: "Redo" }))
    expect(titleNow()).toBe("About")
  })

  it("discard asks first, then throws the changes away", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("button", { name: "Make an edit" }))

    await user.click(within(bar()).getByRole("button", { name: "Discard" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(titleNow()).toBe("About")

    await user.click(
      within(dialog).getByRole("button", { name: "Discard changes" })
    )
    await waitFor(() => expect(titleNow()).toBe("Home"))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
  })

  it("keeps the changes when the discard is cancelled", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("button", { name: "Make an edit" }))
    await user.click(within(bar()).getByRole("button", { name: "Discard" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(titleNow()).toBe("About")
  })
})

describe("the panel", () => {
  it("docks the tabs, showing the first", () => {
    mount()
    const names = screen.getAllByRole("tab").map((tab) => tab.textContent)
    expect(names).toEqual(["Outline", "Block", "Page"])
    expect(screen.getByRole("tabpanel", { name: "Outline" })).toBeTruthy()
    expect(screen.getByText("Outline content")).toBeTruthy()
  })

  it("switches tabs", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("tab", { name: "Page" }))
    expect(screen.getByText("Page content")).toBeTruthy()
    expect(screen.queryByText("Outline content")).toBeNull()
  })

  it("follows a tab chosen from outside", async () => {
    const onTabChange = vi.fn()
    const user = userEvent.setup()
    mount({ tab: "block", onTabChange })
    expect(screen.getByText("Block content")).toBeTruthy()
    await user.click(screen.getByRole("tab", { name: "Page" }))
    expect(onTabChange).toHaveBeenCalledWith("page")
  })
})

describe("the canvas", () => {
  it("is an iframe with a title, on the route it is given", () => {
    mount({ canvasSrc: "/about?edit=1" })
    expect(frame().getAttribute("src")).toBe("/about?edit=1")
    expect(frame().title).toBeTruthy()
  })

  it("starts at Desktop, and the toggles change the iframe's width", async () => {
    const user = userEvent.setup()
    mount()
    const pressed = (name: string) =>
      screen.getByRole("button", { name }).getAttribute("aria-pressed")
    expect(pressed("Desktop")).toBe("true")
    expect(frame().style.width).toBe("100%")

    await user.click(screen.getByRole("button", { name: "Tablet" }))
    expect(frame().style.width).toBe("820px")
    expect(pressed("Tablet")).toBe("true")
    expect(pressed("Desktop")).toBe("false")

    await user.click(screen.getByRole("button", { name: "Mobile" }))
    expect(frame().style.width).toBe("375px")

    await user.click(screen.getByRole("button", { name: "Desktop" }))
    expect(frame().style.width).toBe("100%")
  })

  it("keeps a width chosen when its toggle is pressed again", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("button", { name: "Tablet" }))
    await user.click(screen.getByRole("button", { name: "Tablet" }))
    expect(frame().style.width).toBe("820px")
  })

  it("is the main region the skip link lands on", () => {
    mount()
    expect(screen.getByRole("main").id).toBe("admin-main")
    expect(screen.getByRole("main").contains(frame())).toBe(true)
  })
})

describe("the Ctrl-K Page picker", () => {
  const pickStays = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.keyboard("{Control>}k{/Control}")
    await user.click(await screen.findByRole("option", { name: /Stays/ }))
  }

  it("opens the Page picked in the Visual Editor while clean", async () => {
    const user = userEvent.setup()
    mount()
    await pickStays(user)
    expect(router.push).toHaveBeenCalledWith("/admin/pages/9")
  })

  it("asks first while dirty, and leaves only on Discard", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("button", { name: "Make an edit" }))
    await pickStays(user)
    const dialog = await screen.findByRole("alertdialog")
    expect(router.push).not.toHaveBeenCalled()
    await user.click(
      within(dialog).getByRole("button", { name: "Discard changes" })
    )
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/admin/pages/9")
    )
  })

  it("hands the Page to the mode's own handler instead, when it has one", async () => {
    const user = userEvent.setup()
    const onPickPage = vi.fn()
    mount({ onPickPage })
    await user.click(screen.getByRole("button", { name: "Make an edit" }))
    await pickStays(user)
    expect(onPickPage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, path: "/stays" })
    )
    expect(router.push).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})

describe("the unsaved-changes guard", () => {
  function addLink() {
    const link = document.createElement("a")
    link.href = "/admin/media"
    link.textContent = "Media"
    document.body.append(link)
    return link
  }
  const beforeUnload = () => {
    const event = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(event)
    return event
  }

  it("lets navigation and closing the tab through while clean", async () => {
    const user = userEvent.setup()
    mount()
    const link = addLink()
    await user.click(link)
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(beforeUnload().defaultPrevented).toBe(false)
    link.remove()
  })

  it("blocks in-app navigation while dirty, and asks", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("button", { name: "Make an edit" }))
    const link = addLink()
    await user.click(link)
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("You have unsaved changes")).toBeTruthy()
    expect(router.push).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("button", { name: "Stay" }))
    expect(router.push).not.toHaveBeenCalled()
    link.remove()
  })

  it("blocks the Back link while dirty", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("button", { name: "Make an edit" }))
    await user.click(within(bar()).getByRole("link", { name: /^Back/ }))
    expect(await screen.findByRole("alertdialog")).toBeTruthy()
  })

  it("warns when the tab is closed while dirty", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("button", { name: "Make an edit" }))
    expect(beforeUnload().defaultPrevented).toBe(true)
  })

  it("stops warning once the changes are undone", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("button", { name: "Make an edit" }))
    await user.click(within(bar()).getByRole("button", { name: "Undo" }))
    expect(beforeUnload().defaultPrevented).toBe(false)
  })

  it("saves from the dialog with the save it is given", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(() => ({ ok: true }) as const)
    mount({ onSave })
    await user.click(screen.getByRole("button", { name: "Make an edit" }))
    const link = addLink()
    await user.click(link)
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^Save/ }))
    expect(onSave).toHaveBeenCalledTimes(1)
    link.remove()
  })

  it("discards from the dialog, then leaves", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("button", { name: "Make an edit" }))
    const link = addLink()
    await user.click(link)
    const dialog = await screen.findByRole("alertdialog")
    await user.click(
      within(dialog).getByRole("button", { name: "Discard changes" })
    )
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/admin/media")
    )
    expect(titleNow()).toBe("Home")
    link.remove()
  })
})

describe("accessibility", () => {
  it.each(["page", "layout", "theme"] as const)(
    "has no axe violations in %s mode",
    async (mode) => {
      const { container } = mount({ mode, usedBy: 2, goesLiveOn: 2 })
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
