// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("lucide-react/dynamic", () => ({
  iconNames: ["wifi"],
  DynamicIcon: () => <svg aria-hidden />,
}))

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
  savePage: vi.fn(),
  deletePage: vi.fn(),
}))
vi.mock("../../actions/pages", () => actions)
vi.mock("../../actions/pagePicker", () => ({ searchPages: async () => [] }))

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}))
vi.mock("sonner", () => ({ toast }))

import type { PageDocument } from "../state"
import { PageMode, type PageModeProps } from "./PageMode"

const about: PageDocument = {
  kind: "page",
  title: "About",
  path: "/about",
  layout: { mode: "default" },
  blocks: [
    {
      id: "h1",
      blockType: "hero",
      heading: "About us",
      subheading: "",
      image: null,
      cta: { label: "", href: "" },
    },
  ],
  seo: { title: "", description: "", image: null },
}

const main = {
  id: 3,
  name: "Main",
  isDefault: true,
  paths: [],
  header: [{ id: "lg", blockType: "logo" }] as never,
  footer: [],
}

function mount(props: Partial<PageModeProps> = {}) {
  return render(
    <PageMode
      id={4}
      initial={about}
      status="draft"
      layouts={[main]}
      media={[]}
      pages={[]}
      dependents={[]}
      canvasSrc="/about?__edit=1"
      {...props}
    />
  )
}

/** What the server action returns for a save that worked. */
const saved = (over: Record<string, unknown> = {}) => ({
  ok: true,
  id: 4,
  message: "Draft saved.",
  status: "draft",
  document: about,
  ...over,
})

const topBar = () => screen.getByRole("banner")
const edit = async (title: string) => {
  const user = userEvent.setup()
  await user.click(screen.getByRole("tab", { name: "Page" }))
  const field = screen.getByLabelText("Title", { exact: true })
  await user.clear(field)
  await user.type(field, title)
  return user
}

beforeEach(() => {
  actions.savePage.mockResolvedValue(saved())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("<PageMode> status chip", () => {
  it.each([
    ["draft", "Draft"],
    ["published", "Published"],
    ["changes", "Changes not published"],
  ] as const)("shows %s as %s", (status, label) => {
    mount({ status })
    expect(within(topBar()).getByText(label, { exact: true })).toBeTruthy()
  })

  it("names the Page in the top bar, and follows the title as it is typed", async () => {
    mount()
    expect(
      within(topBar()).getByRole("heading", { name: "About" })
    ).toBeTruthy()
    await edit("About the lodge")
    expect(
      within(topBar()).getByRole("heading", { name: "About the lodge" })
    ).toBeTruthy()
  })
})

describe("<PageMode> Save", () => {
  it("saves the Draft, toasts, and keeps the Draft chip", async () => {
    mount()
    const user = await edit("About v2")
    await user.click(within(topBar()).getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Draft saved.")
    )
    expect(actions.savePage).toHaveBeenCalledWith({
      id: 4,
      intent: "draft",
      document: expect.objectContaining({ title: "About v2" }),
    })
    expect(within(topBar()).getByText("Draft", { exact: true })).toBeTruthy()
  })

  it("keeps the Published version live: a Published Page saved as a Draft reads Changes not published", async () => {
    actions.savePage.mockResolvedValue(
      saved({ status: "changes", document: { ...about, title: "About v2" } })
    )
    mount({ status: "published" })
    const user = await edit("About v2")
    await user.click(within(topBar()).getByRole("button", { name: "Save" }))
    expect(
      await within(topBar()).findByText("Changes not published", {
        exact: true,
      })
    ).toBeTruthy()
    expect(actions.savePage.mock.calls[0]![0].intent).toBe("draft")
  })

  it("has nothing to save until something changes", async () => {
    mount()
    const save = within(topBar()).getByRole("button", { name: "Save" })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    await edit("About v2")
    expect((save as HTMLButtonElement).disabled).toBe(false)
  })

  it("saves with Ctrl-S", async () => {
    mount()
    await edit("About v2")
    const user = userEvent.setup()
    await user.keyboard("{Control>}s{/Control}")
    await waitFor(() => expect(actions.savePage).toHaveBeenCalledTimes(1))
    expect(actions.savePage.mock.calls[0]![0].intent).toBe("draft")
  })

  it("shows why a save failed, inline, naming the Block", async () => {
    actions.savePage.mockResolvedValue({
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: { "blocks.0.heading": "This field is required." },
    })
    mount()
    const user = await edit("About v2")
    await user.click(within(topBar()).getByRole("button", { name: "Save" }))
    const alert = await within(topBar()).findByRole("alert")
    expect(alert.textContent).toContain("Some fields need attention.")
    expect(alert.textContent).toContain(
      "Hero, heading: This field is required."
    )
    expect(toast.success).not.toHaveBeenCalled()
    // Still unsaved: Save is there to try again.
    expect(
      (
        within(topBar()).getByRole("button", {
          name: "Save",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false)
  })

  it("shows a failed request inline too", async () => {
    actions.savePage.mockRejectedValue(new Error("offline"))
    mount()
    const user = await edit("About v2")
    await user.click(within(topBar()).getByRole("button", { name: "Save" }))
    expect((await within(topBar()).findByRole("alert")).textContent).toContain(
      "Could not save"
    )
  })
})

describe("<PageMode> Publish", () => {
  it("publishes what is on screen, toasts, and reads Published", async () => {
    actions.savePage.mockResolvedValue(
      saved({
        message: "Published. The Page is live on the Site.",
        status: "published",
        document: { ...about, title: "About v2" },
      })
    )
    mount()
    const user = await edit("About v2")
    await user.click(within(topBar()).getByRole("button", { name: "Publish" }))
    expect(
      await within(topBar()).findByText("Published", { exact: true })
    ).toBeTruthy()
    expect(actions.savePage).toHaveBeenCalledWith({
      id: 4,
      intent: "publish",
      document: expect.objectContaining({ title: "About v2" }),
    })
    expect(toast.success).toHaveBeenCalledWith(
      "Published. The Page is live on the Site."
    )
  })

  it("can publish a Draft that has no edits", async () => {
    mount({ status: "draft" })
    expect(
      (
        within(topBar()).getByRole("button", {
          name: "Publish",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false)
  })

  it("has nothing to publish when the Page is Published and unchanged", () => {
    mount({ status: "published" })
    // Not `disabled`: it stays a keyboard stop, and says so with aria-disabled.
    expect(
      within(topBar())
        .getByRole("button", { name: "Publish" })
        .getAttribute("aria-disabled")
    ).toBe("true")
  })

  it("can publish a Page whose Draft has Changes not published", () => {
    mount({ status: "changes" })
    expect(
      (
        within(topBar()).getByRole("button", {
          name: "Publish",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false)
  })
})

describe("<PageMode> a New Page", () => {
  it("is created by its first Save, which moves the editor to the Page", async () => {
    actions.savePage.mockResolvedValue(saved({ id: 11 }))
    mount({ id: null })
    // Not dirty, but not saved: Save is there.
    const save = within(topBar()).getByRole("button", { name: "Save" })
    expect((save as HTMLButtonElement).disabled).toBe(false)
    const user = userEvent.setup()
    await user.click(save)
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/admin/pages/11")
    )
    expect(actions.savePage.mock.calls[0]![0].id).toBeNull()
  })

  it("saves later changes to the Page it created", async () => {
    actions.savePage.mockResolvedValue(saved({ id: 11 }))
    mount({ id: null })
    const user = userEvent.setup()
    await user.click(within(topBar()).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(router.replace).toHaveBeenCalled())
    await edit("Renamed")
    await user.click(within(topBar()).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(actions.savePage).toHaveBeenCalledTimes(2))
    expect(actions.savePage.mock.calls[1]![0].id).toBe(11)
  })
})

describe("<PageMode> the Layout", () => {
  it("offers Edit Layout, which opens the Layout", () => {
    mount()
    const link = within(topBar()).getByRole("link", { name: "Edit Layout" })
    expect(link.getAttribute("href")).toBe("/admin/layouts/3")
  })

  it("has no Edit Layout for a Page with no Layout", () => {
    mount({ layouts: [] })
    expect(screen.queryByRole("link", { name: "Edit Layout" })).toBeNull()
  })

  it("shows the Outline with the Layout's Blocks locked", () => {
    mount()
    const outline = screen.getByRole("tabpanel", { name: "Outline" })
    expect(within(outline).getByText("Header")).toBeTruthy()
    expect(within(outline).getAllByRole("treeitem").length).toBeGreaterThan(0)
  })
})

describe("<PageMode> the canvas", () => {
  it("shows the Page's route in its editing mode", () => {
    mount()
    const frame = screen.getByTitle(/as visitors see it/)
    expect(frame.getAttribute("src")).toBe("/about?__edit=1")
  })
})

describe("<PageMode> Blocks", () => {
  it("edits a selected Block in the Block tab", async () => {
    mount()
    const user = userEvent.setup()
    await user.click(screen.getByRole("treeitem", { name: /Hero/ }))
    const panel = await screen.findByRole("tabpanel", { name: "Block" })
    const heading = within(panel).getByLabelText("Heading", { exact: true })
    await user.clear(heading)
    await user.type(heading, "Hello")
    await user.click(within(topBar()).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(actions.savePage).toHaveBeenCalled())
    const sent = actions.savePage.mock.calls[0]![0].document as PageDocument
    expect(sent.blocks[0]).toMatchObject({ id: "h1", heading: "Hello" })
  })

  it("selects a row with Space and keeps focus on it; Enter opens the Block tab with focus in it", async () => {
    mount()
    const user = userEvent.setup()
    const outline = screen.getByRole("tabpanel", { name: "Outline" })
    const hero = within(outline).getByRole("treeitem", { name: /Hero/ })
    hero.focus()
    await user.keyboard(" ")
    expect(hero.getAttribute("aria-selected")).toBe("true")
    expect(
      screen.getByRole("tab", { name: "Outline", selected: true })
    ).toBeTruthy()
    expect(document.activeElement).toBe(hero)
    await user.keyboard("{Enter}")
    const panel = await screen.findByRole("tabpanel", { name: "Block" })
    await waitFor(() =>
      expect(panel.contains(document.activeElement)).toBe(true)
    )
  })

  it("puts focus in the Block tab when a click on a row opens it", async () => {
    mount()
    const user = userEvent.setup()
    await user.click(screen.getByRole("treeitem", { name: /Hero/ }))
    const panel = await screen.findByRole("tabpanel", { name: "Block" })
    await waitFor(() =>
      expect(panel.contains(document.activeElement)).toBe(true)
    )
  })

  it("stays on the Outline when a row's buttons move or remove a Block", async () => {
    const container = {
      id: "c1",
      blockType: "container",
      columns: "1",
      children: [
        { id: "t1", blockType: "richText", markdown: "One" },
        { id: "t2", blockType: "richText", markdown: "Two" },
      ],
    } as never
    mount({ initial: { ...about, blocks: [...about.blocks, container] } })
    const user = userEvent.setup()
    const outline = screen.getByRole("tabpanel", { name: "Outline" })
    await user.click(
      within(outline).getAllByRole("button", {
        name: "Move Rich text down",
      })[0]!
    )
    expect(
      screen.getByRole("tab", { name: "Outline", selected: true })
    ).toBeTruthy()
    await user.click(
      within(outline).getAllByRole("button", { name: "Remove Rich text" })[0]!
    )
    expect(
      screen.getByRole("tab", { name: "Outline", selected: true })
    ).toBeTruthy()
    expect(document.activeElement).toBe(
      within(outline).getByRole("treeitem", { name: "Container" })
    )
    expect(within(outline).getByText("Rich text removed.")).toBeTruthy()
  })
})
