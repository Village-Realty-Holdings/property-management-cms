// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Link from "next/link"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const actions = vi.hoisted(() => ({ savePage: vi.fn(), deletePage: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))
const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}))

vi.mock("../actions/pages", () => actions)
vi.mock("sonner", () => ({ toast }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

import {
  emptyBlock,
  emptyPage,
  type HeroValues,
  type PageValues,
} from "../pageForm"
import { PageEditor } from "./PageEditor"

const about: PageValues = {
  ...emptyPage,
  title: "About",
  path: "/about",
  layout: [
    { ...(emptyBlock("hero") as HeroValues), id: "b1", heading: "About us" },
  ],
}

const stored = (values: PageValues): PageValues => ({
  ...values,
  layout: values.layout.map((block) => ({ ...block, id: block.id ?? "gen1" })),
})

beforeEach(() => {
  for (const fn of Object.values(router)) fn.mockReset()
  actions.deletePage.mockResolvedValue({
    ok: true,
    message: "Deleted Page “About”.",
  })
  window.history.replaceState(null, "", "/admin/pages/1")
  actions.savePage.mockImplementation(async ({ intent, values }) => ({
    ok: true,
    message: intent === "publish" ? "Published." : "Draft saved.",
    id: 1,
    status: intent === "publish" ? "published" : "changes",
    values: stored(values),
  }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const renderEditor = (props: Partial<Parameters<typeof PageEditor>[0]> = {}) =>
  render(
    <>
      <Link href="/admin/media">Media</Link>
      <PageEditor
        id={1}
        initial={about}
        status="draft"
        media={[]}
        {...props}
        dependents={props.dependents ?? []}
      />
    </>
  )

const retitle = async (
  user: ReturnType<typeof userEvent.setup>,
  to: string
) => {
  const title = screen.getByLabelText("Title")
  await user.clear(title)
  await user.type(title, to)
}

describe("<PageEditor> unsaved changes", () => {
  it("lets a clean editor go", () => {
    renderEditor()
    fireEvent.click(screen.getByRole("link", { name: "Media" }))
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("asks Save / Discard / Stay when a dirty Page is left through a link", async () => {
    const user = userEvent.setup()
    renderEditor()
    await retitle(user, "About us")
    expect(screen.getByText("Unsaved changes")).toBeTruthy()

    fireEvent.click(screen.getByRole("link", { name: "← Pages" }))
    const dialog = await screen.findByRole("alertdialog")
    for (const name of ["Save", "Discard changes", "Stay"]) {
      expect(
        within(dialog).getByRole("button", { name: new RegExp(name) })
      ).toBeTruthy()
    }
    expect(router.push).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("button", { name: /Stay/ }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
      "About us"
    )
  })

  it("warns on closing the tab only while dirty", async () => {
    const user = userEvent.setup()
    renderEditor()
    const clean = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    await retitle(user, "About us")
    const dirty = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
  })

  it("saves a draft from the dialog, then goes where the user was going", async () => {
    const user = userEvent.setup()
    renderEditor()
    await retitle(user, "About us")
    fireEvent.click(screen.getByRole("link", { name: "Media" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^Save/ }))

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/admin/media")
    )
    expect(actions.savePage).toHaveBeenCalledWith({
      id: 1,
      intent: "draft",
      values: expect.objectContaining({ title: "About us" }),
    })
    expect(toast.success).toHaveBeenCalledWith("Draft saved.")
  })

  it("stays put, with the reason, when saving from the dialog fails", async () => {
    actions.savePage.mockResolvedValue({
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: { path: "Path is taken." },
    })
    const user = userEvent.setup()
    renderEditor()
    await retitle(user, "About us")
    fireEvent.click(screen.getByRole("link", { name: "Media" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^Save/ }))

    expect(
      await within(dialog).findByText(/Some fields need attention/)
    ).toBeTruthy()
    expect(router.push).not.toHaveBeenCalled()
  })
})

describe("<PageEditor> saving", () => {
  it("confirms a Draft save with a toast, not an inline message", async () => {
    const user = userEvent.setup()
    renderEditor()
    await retitle(user, "About us")
    await user.click(screen.getByRole("button", { name: "Save draft" }))

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Draft saved.")
    )
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("status", { name: /saved/i })).toBeNull()
    expect(screen.queryByText("Draft saved.")).toBeNull()
    // Saved: clean again, so leaving does not ask.
    await waitFor(() =>
      expect(screen.queryByText("Unsaved changes")).toBeNull()
    )
    fireEvent.click(screen.getByRole("link", { name: "Media" }))
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it("publishes, and the badge follows the result", async () => {
    const user = userEvent.setup()
    renderEditor()
    await user.click(screen.getByRole("button", { name: "Publish" }))

    await waitFor(() =>
      expect(actions.savePage).toHaveBeenCalledWith({
        id: 1,
        intent: "publish",
        values: about,
      })
    )
    expect(await screen.findByText("Published")).toBeTruthy()
    expect(toast.success).toHaveBeenCalledWith("Published.")
    expect(screen.getByRole("button", { name: "Unpublish" })).toBeTruthy()
  })

  it("moves a new Page to its own address after the first save", async () => {
    actions.savePage.mockImplementation(async ({ values }) => ({
      ok: true,
      message: "Draft saved.",
      id: 12,
      status: "draft",
      values: stored(values),
    }))
    const user = userEvent.setup()
    renderEditor({ id: null, status: "new", initial: { ...about, title: "" } })
    await retitle(user, "Fresh")
    await user.click(screen.getByRole("button", { name: "Save draft" }))

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/admin/pages/12")
    )
    expect(actions.savePage).toHaveBeenCalledWith(
      expect.objectContaining({ id: null })
    )
    expect(toast.success).toHaveBeenCalledWith("Draft saved.")
  })

  it("does not move a new Page when the unsaved-changes dialog saved it", async () => {
    actions.savePage.mockImplementation(async ({ values }) => ({
      ok: true,
      message: "Draft saved.",
      id: 12,
      status: "draft",
      values: stored(values),
    }))
    const user = userEvent.setup()
    renderEditor({ id: null, status: "new", initial: { ...about, title: "" } })
    await retitle(user, "Fresh")
    fireEvent.click(screen.getByRole("link", { name: "Media" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^Save/ }))

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/admin/media")
    )
    expect(router.replace).not.toHaveBeenCalled()
  })

  it("shows failures inline with the field errors, without a toast", async () => {
    actions.savePage.mockResolvedValue({
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: { path: "Path is already used." },
    })
    const user = userEvent.setup()
    renderEditor()
    await retitle(user, "About us")
    await user.click(screen.getByRole("button", { name: "Publish" }))

    expect(
      (await screen.findByText("Some fields need attention.")).closest(
        "[data-slot=inline-error]"
      )
    ).toBeTruthy()
    expect(screen.getByText("Path is already used.")).toBeTruthy()
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByText("Unsaved changes")).toBeTruthy()
  })

  it("shows a network failure inline and keeps what was typed", async () => {
    actions.savePage.mockRejectedValue(new Error("offline"))
    const user = userEvent.setup()
    renderEditor()
    await retitle(user, "About us")
    await user.click(screen.getByRole("button", { name: "Save draft" }))

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not save"
    )
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
      "About us"
    )
    expect(screen.getByText("Unsaved changes")).toBeTruthy()
  })
})

describe("<PageEditor> deleting", () => {
  it("asks first, naming the Page and what links to it", async () => {
    const user = userEvent.setup()
    renderEditor({
      status: "published",
      dependents: [{ kind: "Page", name: "Home" }],
    })
    await user.click(screen.getByRole("button", { name: "Delete Page" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Delete Page “About”?")).toBeTruthy()
    expect(within(dialog).getByText(/live on the Site at \/about/)).toBeTruthy()
    expect(within(dialog).getByText("Page: Home")).toBeTruthy()
    expect(actions.deletePage).not.toHaveBeenCalled()
  })

  it("has nothing to delete on a new Page", () => {
    renderEditor({ id: null, status: "new" })
    expect(screen.queryByRole("button", { name: "Delete Page" })).toBeNull()
  })

  it("goes back to the list once deleted, without asking about unsaved changes", async () => {
    const user = userEvent.setup()
    renderEditor()
    await retitle(user, "About us")
    await user.click(screen.getByRole("button", { name: "Delete Page" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(
      within(dialog).getByRole("button", { name: "Delete Page" })
    )

    await waitFor(() => expect(actions.deletePage).toHaveBeenCalledWith(1))
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/admin/pages")
    )
    expect(toast.success).toHaveBeenCalledWith("Deleted Page “About”.")
    expect(screen.queryByText(/Unsaved changes/)).toBeNull()
  })
})

describe("<PageEditor> field errors and descriptions", () => {
  const describedByIds = (el: HTMLElement) =>
    (el.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean)

  it("links each failed field to its message for screen readers", async () => {
    actions.savePage.mockResolvedValue({
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: {
        title: "This field is required.",
        "layout.0.heading": "This field is required.",
        "layout.0.cta.href": "Enter a path or a URL.",
        "seo.title": "Too long.",
        "seo.description": "Too long.",
      },
    })
    const user = userEvent.setup()
    renderEditor()
    await user.click(screen.getByRole("button", { name: "Save draft" }))
    await screen.findByText("Some fields need attention.")

    const title = screen.getByLabelText("Title")
    expect(title.getAttribute("aria-invalid")).toBe("true")
    expect(describedByIds(title)).toEqual(["title-error"])

    const heading = document.getElementById("block-0-heading")!
    expect(heading.getAttribute("aria-invalid")).toBe("true")
    expect(describedByIds(heading)).toEqual(["block-0-heading-error"])

    // A description and an error together: both are read.
    const href = document.getElementById("block-0-cta-href")!
    expect(href.getAttribute("aria-invalid")).toBe("true")
    expect(describedByIds(href)).toEqual([
      "block-0-cta-href-description",
      "block-0-cta-href-error",
    ])

    const seoTitle = screen.getByLabelText("SEO title")
    expect(seoTitle.getAttribute("aria-invalid")).toBe("true")
    expect(describedByIds(seoTitle)).toEqual([
      "seo-title-description",
      "seo-title-error",
    ])
    expect(
      screen.getByLabelText("SEO description").getAttribute("aria-invalid")
    ).toBe("true")

    // Every id a field points at is on the page.
    for (const input of document.querySelectorAll("[aria-describedby]")) {
      for (const id of describedByIds(input as HTMLElement)) {
        expect(document.getElementById(id), id).toBeTruthy()
      }
    }
  })

  it("marks nothing invalid before a save fails, but still ties descriptions", () => {
    renderEditor()
    expect(document.querySelector("[aria-invalid]")).toBeNull()
    expect(describedByIds(screen.getByLabelText("Path"))).toEqual([
      "path-description",
    ])
    expect(describedByIds(screen.getByLabelText("SEO title"))).toEqual([
      "seo-title-description",
    ])
  })

  it("links the Block selects, and the SEO image, too", async () => {
    actions.savePage.mockResolvedValue({
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: { "seo.image": "Pick an image.", "layout.0.style": "Bad." },
    })
    const user = userEvent.setup()
    renderEditor({
      initial: { ...about, layout: [emptyBlock("callToAction")] },
    })
    await user.click(screen.getByRole("button", { name: "Save draft" }))
    await screen.findByText("Some fields need attention.")

    expect(
      document.getElementById("seo-image")!.getAttribute("aria-describedby")
    ).toBe("seo-image-error")
    expect(
      document.getElementById("block-0-style")!.getAttribute("aria-invalid")
    ).toBe("true")
  })
})

describe("<PageEditor> Blocks by keyboard", () => {
  const three: PageValues = {
    ...about,
    layout: [
      { ...(emptyBlock("hero") as HeroValues), id: "b1", heading: "One" },
      { ...emptyBlock("richText"), id: "b2" },
      { ...emptyBlock("callToAction"), id: "b3" },
    ],
  }
  const button = (block: number, name: string) =>
    within(
      screen.getByRole("group", { name: new RegExp(`^${block}\\.`) })
    ).getByRole("button", { name })
  const card = (block: number) =>
    screen.getByRole("group", { name: new RegExp(`^${block}\\.`) })
  const press = async (
    user: ReturnType<typeof userEvent.setup>,
    el: HTMLElement
  ) => {
    el.focus()
    await user.keyboard("{Enter}")
  }

  it("keeps focus on Move down of the Block that moved", async () => {
    const user = userEvent.setup()
    renderEditor({ initial: three })
    await press(user, button(1, "Move down"))

    // The Hero is now second: focus stays with its Move down.
    expect(card(2).getAttribute("aria-label")).toMatch(/Hero/)
    await waitFor(() =>
      expect(document.activeElement).toBe(button(2, "Move down"))
    )
    expect(
      screen.getByRole("status", { name: "Block changes" }).textContent
    ).toBe("Moved Hero to position 2 of 3.")
  })

  it("keeps focus on Move up of the Block that moved", async () => {
    const user = userEvent.setup()
    renderEditor({ initial: three })
    await press(user, button(3, "Move up"))
    await waitFor(() =>
      expect(document.activeElement).toBe(button(2, "Move up"))
    )
    expect(
      screen.getByRole("status", { name: "Block changes" }).textContent
    ).toBe("Moved Call to action to position 2 of 3.")
  })

  it("moves focus to the other arrow when the Block reaches an end", async () => {
    const user = userEvent.setup()
    renderEditor({ initial: three })
    await press(user, button(2, "Move up"))
    // Now first: Move up is disabled, so focus takes Move down.
    await waitFor(() =>
      expect(document.activeElement).toBe(button(1, "Move down"))
    )
  })

  it("keeps the same fields for Blocks that are not saved yet when they move", async () => {
    const user = userEvent.setup()
    renderEditor({ initial: { ...about, layout: [] } })
    await user.click(screen.getByRole("button", { name: /Hero/ }))
    await user.click(screen.getByRole("button", { name: /Call to action/ }))
    const first = within(card(1)).getByLabelText("Heading")
    await user.type(first, "Typed")

    await press(user, button(1, "Move down"))
    expect(within(card(2)).getByLabelText("Heading")).toBe(first)
    expect((first as HTMLInputElement).value).toBe("Typed")
    await waitFor(() =>
      expect(document.activeElement).toBe(button(2, "Move up"))
    )
  })

  it("moves focus to the previous Block when one is removed", async () => {
    const user = userEvent.setup()
    renderEditor({ initial: three })
    await press(user, button(2, "Remove Block"))

    expect(screen.getAllByRole("group", { name: /^\d\./ })).toHaveLength(2)
    await waitFor(() => expect(document.activeElement).toBe(card(1)))
    expect(
      screen.getByRole("status", { name: "Block changes" }).textContent
    ).toBe("Removed Rich text. 2 Blocks left.")
  })

  it("moves focus to the next Block when the first is removed", async () => {
    const user = userEvent.setup()
    renderEditor({ initial: three })
    await press(user, button(1, "Remove Block"))
    await waitFor(() => expect(document.activeElement).toBe(card(1)))
    expect(card(1).getAttribute("aria-label")).toMatch(/Rich text/)
  })

  it("moves focus to Add Block when the last Block is removed", async () => {
    const user = userEvent.setup()
    renderEditor({ initial: { ...about, layout: [three.layout[0]!] } })
    await press(user, button(1, "Remove Block"))
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: /Hero/ })
      )
    )
    expect(
      screen.getByRole("status", { name: "Block changes" }).textContent
    ).toBe("Removed Hero. No Blocks left.")
  })
})
