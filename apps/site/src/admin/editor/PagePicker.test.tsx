// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
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

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

const searchPages = vi.hoisted(() => vi.fn())
vi.mock("../actions/pagePicker", () => ({ searchPages }))

import { PagePicker, type PickerPage } from "./PagePicker"

const PAGES: PickerPage[] = [
  { id: 1, title: "Home", path: "/", status: "published" },
  {
    id: 2,
    title: "Harbour View",
    path: "/stays/harbour-view",
    status: "draft",
  },
  { id: 3, title: "About us", path: "/about", status: "changes" },
]

/** Stands in for the Server Action, which filters on title or path. */
function fakeSearch(query: string): Promise<PickerPage[]> {
  const q = query.trim().toLowerCase()
  return Promise.resolve(
    PAGES.filter(
      (p) => !q || p.title.toLowerCase().includes(q) || p.path.includes(q)
    )
  )
}

beforeAll(() => {
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.assign(globalThis, { ResizeObserver: Observer })
  Element.prototype.scrollIntoView ??= () => {}
})
beforeEach(() => {
  router.push.mockReset()
  searchPages.mockReset()
  searchPages.mockImplementation(fakeSearch)
})
afterEach(cleanup)

const dialog = () => screen.getByRole("dialog", { name: /Pages?/ })
const option = (name: RegExp | string) => screen.getByRole("option", { name })
const searchBox = () => screen.getByRole("combobox")
const ctrlK = "{Control>}k{/Control}"

describe("the top bar button", () => {
  it("shows the Ctrl K hint and opens the picker", async () => {
    const user = userEvent.setup()
    render(<PagePicker />)
    const button = screen.getByRole("button", { name: /Pages\s+Ctrl K/ })
    expect(screen.queryByRole("dialog")).toBeNull()
    await user.click(button)
    expect(dialog()).toBeTruthy()
  })
})

describe("the Ctrl-K shortcut", () => {
  it.each([
    ["Ctrl-K", { ctrlKey: true }],
    ["Cmd-K", { metaKey: true }],
  ])(
    "%s opens the picker and keeps the browser's own shortcut away",
    async (_name, mods) => {
      render(<PagePicker />)
      const event = new KeyboardEvent("keydown", {
        key: "k",
        bubbles: true,
        cancelable: true,
        ...mods,
      })
      document.body.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
      await waitFor(() => expect(dialog()).toBeTruthy())
    }
  )

  it("ignores a plain k, and Ctrl with another key", async () => {
    const user = userEvent.setup()
    render(<PagePicker />)
    await user.keyboard("k")
    await user.keyboard("{Control>}j{/Control}")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("stops listening once the picker is gone", async () => {
    const user = userEvent.setup()
    const { unmount } = render(<PagePicker />)
    unmount()
    await user.keyboard(ctrlK)
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})

describe("searching", () => {
  it("lists Pages with their status as soon as it opens, Drafts included", async () => {
    const user = userEvent.setup()
    render(<PagePicker />)
    await user.keyboard(ctrlK)
    expect(await screen.findAllByRole("option")).toHaveLength(3)
    expect(searchPages).toHaveBeenCalledWith("")
    expect(option(/Harbour View/).textContent).toMatch(/Draft/)
    expect(option(/Home/).textContent).toMatch(/Published/)
    expect(option(/About us/).textContent).toMatch(/Changes not published/)
    expect(option(/Harbour View/).textContent).toMatch(/\/stays\/harbour-view/)
  })

  it("searches by title", async () => {
    const user = userEvent.setup()
    render(<PagePicker />)
    await user.keyboard(ctrlK)
    await screen.findAllByRole("option")
    await user.type(searchBox(), "harbour")
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1))
    expect(option(/Harbour View/)).toBeTruthy()
    expect(searchPages).toHaveBeenLastCalledWith("harbour")
  })

  it("searches by path", async () => {
    const user = userEvent.setup()
    render(<PagePicker />)
    await user.keyboard(ctrlK)
    await screen.findAllByRole("option")
    await user.type(searchBox(), "/about")
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1))
    expect(option(/About us/)).toBeTruthy()
  })

  it("says so when no Page matches", async () => {
    const user = userEvent.setup()
    render(<PagePicker />)
    await user.keyboard(ctrlK)
    await user.type(searchBox(), "zzz")
    expect(await screen.findByText(/No Pages match/)).toBeTruthy()
    expect(screen.queryAllByRole("option")).toHaveLength(0)
  })

  it("says so when the search fails, and keeps the picker open", async () => {
    searchPages.mockRejectedValue(new Error("boom"))
    const user = userEvent.setup()
    render(<PagePicker />)
    await user.keyboard(ctrlK)
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(dialog()).toBeTruthy()
  })

  it("shows the answer to the latest search, never a slower earlier one", async () => {
    let resolveSlow: (pages: PickerPage[]) => void = () => {}
    const slow = new Promise<PickerPage[]>((resolve) => {
      resolveSlow = resolve
    })
    searchPages.mockImplementation((q: string) =>
      q === "h" ? slow : fakeSearch(q)
    )
    const user = userEvent.setup()
    render(<PagePicker />)
    await user.keyboard(ctrlK)
    await screen.findAllByRole("option")
    await user.type(searchBox(), "h")
    await waitFor(() => expect(searchPages).toHaveBeenCalledWith("h"))
    await user.type(searchBox(), "ome")
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1))
    resolveSlow(PAGES)
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getAllByRole("option")).toHaveLength(1)
    expect(option(/Home/)).toBeTruthy()
  })

  it("starts from an empty search each time it opens", async () => {
    const user = userEvent.setup()
    render(<PagePicker />)
    await user.keyboard(ctrlK)
    await user.type(searchBox(), "home")
    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await user.keyboard(ctrlK)
    expect((searchBox() as HTMLInputElement).value).toBe("")
  })
})

describe("choosing a Page", () => {
  it("Enter calls onPick with the highlighted Page and closes", async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<PagePicker onPick={onPick} />)
    await user.keyboard(ctrlK)
    await screen.findAllByRole("option")
    await user.type(searchBox(), "harbour")
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1))
    await user.keyboard("{Enter}")
    expect(onPick).toHaveBeenCalledExactlyOnceWith(PAGES[1])
    expect(router.push).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("Enter before the search has answered waits for it, and never picks a stale Page", async () => {
    let resolveSearch: (pages: PickerPage[]) => void = () => {}
    const pending = new Promise<PickerPage[]>((resolve) => {
      resolveSearch = resolve
    })
    searchPages.mockImplementation((q: string) =>
      q === "harbour" ? pending : fakeSearch(q)
    )
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<PagePicker onPick={onPick} />)
    await user.keyboard(ctrlK)
    await screen.findAllByRole("option")
    await user.type(searchBox(), "harbour{Enter}")
    // The list still shows the answer to the empty search: Home is first.
    expect(onPick).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeTruthy()
    resolveSearch([PAGES[1]!])
    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1))
    expect(onPick).toHaveBeenCalledWith(PAGES[1])
  })

  it("an Enter that is waiting is dropped when the picker closes", async () => {
    let resolveSearch: (pages: PickerPage[]) => void = () => {}
    const pending = new Promise<PickerPage[]>((resolve) => {
      resolveSearch = resolve
    })
    searchPages.mockImplementation((q: string) =>
      q === "harbour" ? pending : fakeSearch(q)
    )
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<PagePicker onPick={onPick} />)
    await user.keyboard(ctrlK)
    await screen.findAllByRole("option")
    await user.type(searchBox(), "harbour{Enter}{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    resolveSearch([PAGES[1]!])
    await new Promise((r) => setTimeout(r, 20))
    expect(onPick).not.toHaveBeenCalled()
  })

  it("clicking a Page picks it too", async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<PagePicker onPick={onPick} />)
    await user.keyboard(ctrlK)
    await user.click(await screen.findByRole("option", { name: /About us/ }))
    expect(onPick).toHaveBeenCalledExactlyOnceWith(PAGES[2])
  })

  it("opens the Page in the Visual Editor when nothing overrides it", async () => {
    const user = userEvent.setup()
    render(<PagePicker />)
    await user.keyboard(ctrlK)
    await user.click(await screen.findByRole("option", { name: /About us/ }))
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/admin/pages/3")
  })

  it("Esc closes without picking, and puts focus back on the button", async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<PagePicker onPick={onPick} />)
    const button = screen.getByRole("button", { name: /Ctrl K/ })
    await user.click(button)
    await screen.findAllByRole("option")
    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(onPick).not.toHaveBeenCalled()
    await waitFor(() => expect(document.activeElement).toBe(button))
  })
})

describe("accessibility", () => {
  it("the open picker has no axe violations", async () => {
    const user = userEvent.setup()
    render(<PagePicker />)
    await user.keyboard(ctrlK)
    await screen.findAllByRole("option")
    const { violations } = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    })
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
})
