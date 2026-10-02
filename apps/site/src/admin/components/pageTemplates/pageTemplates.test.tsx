// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

const actions = vi.hoisted(() => ({ addStarterTemplates: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))

vi.mock("../../actions/pageTemplates", () => actions)
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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
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
  it("goes straight to a blank Page when there are no Page Templates", () => {
    render(<NewPageButton templates={[]} />)
    expect(href(screen.getByRole("link", { name: "New Page" }))).toBe(
      "/admin/pages/new"
    )
  })

  it("offers a blank Page and every Page Template", async () => {
    const user = userEvent.setup()
    render(<NewPageButton templates={[landing, contact]} />)
    await user.click(screen.getByRole("button", { name: "New Page" }))

    const dialog = await screen.findByRole("dialog")
    const links = within(dialog).getAllByRole("link")
    expect(links.map(href)).toEqual([
      "/admin/pages/new",
      "/admin/pages/new?template=3",
      "/admin/pages/new?template=5",
    ])
    expect(links[1]!.textContent).toContain("Landing")
    expect(links[1]!.textContent).toContain("2 Blocks: Hero, Rich text")
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
      href(within(row).getByRole("link", { name: "New Page from Landing" }))
    ).toBe("/admin/pages/new?template=3")
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
        "Added “Home template”, “Tuck-in template” and “Guest survey template”.",
    })
    const user = userEvent.setup()
    render(<AddStarterTemplatesButton />)
    await user.click(
      screen.getByRole("button", { name: "Add starter templates" })
    )

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Added “Home template”, “Tuck-in template” and “Guest survey template”."
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
