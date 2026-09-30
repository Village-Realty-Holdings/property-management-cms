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
