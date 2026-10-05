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

const actions = vi.hoisted(() => ({
  addStarterTemplates: vi.fn(),
  listPageTemplates: vi.fn(),
}))
const pages = vi.hoisted(() => ({ pagePathTaken: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))

vi.mock("../../actions/pageTemplates", () => actions)
vi.mock("../../actions/pages", () => pages)
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("sonner", () => ({ toast }))

import type { PageTemplateRow } from "../../pageTemplates"
import { AddStarterTemplatesButton } from "./AddStarterTemplatesButton"
import { NewPageButton } from "./NewPageButton"
import { PageTemplatesTable } from "./PageTemplatesTable"
import { blocksSummary } from "./summary"

const landing: PageTemplateRow = {
  id: 3,
  name: "Landing",
  blocks: ["Hero", "Rich text"],
  updatedAt: "2026-10-01T12:00:00.000Z",
}
const contact: PageTemplateRow = {
  id: 5,
  name: "Contact",
  blocks: ["Form"],
  updatedAt: "2026-10-01T12:00:00.000Z",
}

beforeEach(() => {
  pages.pagePathTaken.mockResolvedValue(false)
  actions.listPageTemplates.mockResolvedValue([landing, contact])
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const href = (element: HTMLElement) => element.getAttribute("href")

describe("blocksSummary", () => {
  it("counts and names the Blocks", () => {
    expect(blocksSummary([])).toBe("No Blocks")
    expect(blocksSummary(["Hero"])).toBe("1 Block: Hero")
    expect(blocksSummary(["Hero", "Form"])).toBe("2 Blocks: Hero, Form")
  })
})

describe("<NewPageButton>", () => {
  const open = async (templates?: PageTemplateRow[]) => {
    const user = userEvent.setup()
    render(<NewPageButton templates={templates} />)
    await user.click(screen.getByRole("button", { name: "New Page" }))
    const dialog = await screen.findByRole("dialog")
    return { user, dialog }
  }

  it("always opens the dialog, even with no Page Templates", async () => {
    const { dialog } = await open([])
    expect(within(dialog).getByLabelText("Title")).toBeTruthy()
    expect(within(dialog).getByLabelText("Path")).toBeTruthy()
    const start = within(dialog).getByLabelText("Start from")
    expect(
      within(start)
        .getAllByRole("option")
        .map((o) => o.textContent)
    ).toEqual(["Blank Page"])
  })

  it("makes the Path follow the Title until the Path is edited by hand", async () => {
    const { user, dialog } = await open([])
    const title = within(dialog).getByLabelText("Title") as HTMLInputElement
    const path = within(dialog).getByLabelText("Path") as HTMLInputElement

    await user.type(title, "Our story")
    expect(path.value).toBe("/our-story")
    await user.type(title, " 2")
    expect(path.value).toBe("/our-story-2")

    await user.clear(path)
    await user.type(path, "/about")
    await user.type(title, "!")
    expect(path.value).toBe("/about")
  })

  it("checks the Path as it is typed", async () => {
    const { user, dialog } = await open([])
    const path = within(dialog).getByLabelText("Path")
    await user.type(path, "About Us")
    expect(dialog.textContent).toContain('The path must start with "/".')
    await user.clear(path)
    await user.type(path, "/admin")
    expect(dialog.textContent).toContain("is used by the app")
  })

  it("asks for a Title", async () => {
    const { user, dialog } = await open([])
    await user.click(within(dialog).getByRole("button", { name: "Continue" }))
    expect(dialog.textContent).toContain("A title is required.")
    expect(router.push).not.toHaveBeenCalled()
  })

  it("does not go on while the Path is malformed", async () => {
    const { user, dialog } = await open([])
    await user.type(within(dialog).getByLabelText("Title"), "About")
    const path = within(dialog).getByLabelText("Path")
    await user.clear(path)
    await user.type(path, "About Us")
    await user.click(within(dialog).getByRole("button", { name: "Continue" }))

    expect(dialog.textContent).toContain('The path must start with "/".')
    expect(pages.pagePathTaken).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })

  it("says when another Page uses the Path, and does not go on", async () => {
    pages.pagePathTaken.mockResolvedValue(true)
    const { user, dialog } = await open([])
    await user.type(within(dialog).getByLabelText("Title"), "About")
    await user.click(within(dialog).getByRole("button", { name: "Continue" }))

    expect(pages.pagePathTaken).toHaveBeenCalledWith("/about")
    expect(dialog.textContent).toContain("Another Page uses this path.")
    expect(router.push).not.toHaveBeenCalled()

    // Changing the Path clears the message.
    await user.type(within(dialog).getByLabelText("Path"), "-us")
    expect(dialog.textContent).not.toContain("Another Page uses this path.")
  })

  it("opens a blank Page with the Title and Path", async () => {
    const { user, dialog } = await open([landing])
    await user.type(within(dialog).getByLabelText("Title"), "Our story")
    await user.click(within(dialog).getByRole("button", { name: "Continue" }))

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        "/admin/pages/new?title=Our+story&path=%2Four-story"
      )
    )
  })

  it("opens a Page from the chosen Page Template", async () => {
    const { user, dialog } = await open([landing, contact])
    await user.type(within(dialog).getByLabelText("Title"), "Get in touch")
    await user.selectOptions(within(dialog).getByLabelText("Start from"), "5")
    await user.click(within(dialog).getByRole("button", { name: "Continue" }))

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        "/admin/pages/new?title=Get+in+touch&path=%2Fget-in-touch&template=5"
      )
    )
  })

  it("looks the Page Templates up when the caller has none to give", async () => {
    const { dialog } = await open()
    const start = within(dialog).getByLabelText("Start from")
    await waitFor(() =>
      expect(
        within(start)
          .getAllByRole("option")
          .map((o) => o.textContent)
      ).toEqual([
        "Blank Page",
        "Landing (2 Blocks: Hero, Rich text)",
        "Contact (1 Block: Form)",
      ])
    )
  })

  it("starts on the Page Template it was opened for", async () => {
    const user = userEvent.setup()
    render(
      <NewPageButton
        templates={[landing, contact]}
        initialTemplateId={5}
        ariaLabel="New Page from Contact"
      />
    )
    await user.click(
      screen.getByRole("button", { name: "New Page from Contact" })
    )
    const start = (await screen.findByLabelText(
      "Start from"
    )) as HTMLSelectElement
    expect(start.value).toBe("5")
  })
})

describe("<PageTemplatesTable>", () => {
  it("says how to make the first Page Template, and offers the starters", () => {
    render(
      <PageTemplatesTable
        rows={[]}
        emptyAction={<button>Add starters</button>}
      />
    )
    expect(screen.getByText("No Page Templates yet")).toBeTruthy()
    expect(screen.getByText(/Use as a Page Template/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Add starters" })).toBeTruthy()
  })

  it("lists each Page Template: New Page from it, and Edit in the Visual Editor", () => {
    render(<PageTemplatesTable rows={[landing, contact]} />)
    const row = screen.getByRole("row", { name: /Landing/ })
    expect(within(row).getByText("2 Blocks: Hero, Rich text")).toBeTruthy()
    expect(href(within(row).getByRole("link", { name: "Landing" }))).toBe(
      "/admin/pages/3"
    )
    expect(
      within(row).getByRole("button", { name: "New Page from Landing" })
    ).toBeTruthy()
    expect(href(within(row).getByRole("link", { name: "Edit Landing" }))).toBe(
      "/admin/pages/3?tab=page"
    )
  })
})

describe("<AddStarterTemplatesButton>", () => {
  it("adds the starters and confirms with a toast", async () => {
    actions.addStarterTemplates.mockResolvedValue({
      ok: true,
      message:
        "Added “Home template”, “Tuck-in template” and “Guest feedback survey template”.",
    })
    const user = userEvent.setup()
    render(<AddStarterTemplatesButton />)
    await user.click(
      screen.getByRole("button", { name: "Add starter templates" })
    )

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Added “Home template”, “Tuck-in template” and “Guest feedback survey template”."
      )
    )
  })

  it("shows a failure next to the button", async () => {
    actions.addStarterTemplates.mockResolvedValue({
      ok: false,
      message: "You are not allowed to perform this action.",
    })
    const user = userEvent.setup()
    render(<AddStarterTemplatesButton />)
    await user.click(
      screen.getByRole("button", { name: "Add starter templates" })
    )

    expect((await screen.findByRole("alert")).textContent).toContain(
      "not allowed"
    )
    expect(toast.success).not.toHaveBeenCalled()
  })
})
