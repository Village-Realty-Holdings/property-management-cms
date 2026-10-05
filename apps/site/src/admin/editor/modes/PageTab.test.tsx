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

const pages = vi.hoisted(() => ({ savePage: vi.fn(), deletePage: vi.fn() }))
vi.mock("../../actions/pages", () => pages)
vi.mock("../../actions/media", () => ({ uploadMedia: vi.fn() }))
vi.mock("../../actions/pagePicker", () => ({ searchPages: async () => [] }))
const layoutActions = vi.hoisted(() => ({
  makeLayoutFromPageDocument: vi.fn(),
}))
vi.mock("../../actions/layouts", () => layoutActions)
const linkActions = vi.hoisted(() => ({ linksToPath: vi.fn() }))
vi.mock("../../actions/links", () => linkActions)

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}))
vi.mock("sonner", () => ({ toast }))

import type { PageDocument } from "../state"
import { PageMode, type PageModeProps } from "./PageMode"
import type { LayoutOption } from "./pageTabModel"

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

const option = (
  over: Partial<LayoutOption> & { id: number }
): LayoutOption => ({
  name: `Layout ${over.id}`,
  isDefault: false,
  paths: [],
  header: [],
  footer: [],
  ...over,
})
const main = option({ id: 3, name: "Main", isDefault: true })
const listings = option({ id: 4, name: "Listings", paths: ["/stays"] })

function mount(props: Partial<PageModeProps> = {}) {
  // A live Page is served at the path its Draft starts with, unless the test
  // says its Draft has moved on.
  const status = props.status ?? "draft"
  const publishedPath =
    props.publishedPath !== undefined
      ? props.publishedPath
      : status === "draft"
        ? null
        : (props.initial ?? about).path
  return render(
    <PageMode
      id={4}
      initial={about}
      status="draft"
      publishedPath={publishedPath}
      layouts={[main, listings]}
      media={[{ id: 7, label: "Beach", url: null }]}
      pages={[]}
      dependents={[]}
      canvasSrc="/about?__edit=1"
      initialTab="page"
      {...props}
    />
  )
}

const topBar = () => screen.getByRole("banner")
const panel = () => screen.getByRole("tabpanel", { name: "Page" })
const button = (scope: HTMLElement, name: string) =>
  scope.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`) ??
  (within(scope).getByRole("button", { name }) as HTMLButtonElement)

beforeEach(() => {
  linkActions.linksToPath.mockResolvedValue([])
  pages.savePage.mockResolvedValue({ ok: true, id: 4 })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("<PageTab> opening", () => {
  it("opens on the Page tab when asked to, as the SEO screen's links do", () => {
    mount()
    expect(panel()).toBeTruthy()
    expect(
      screen.getByRole("tab", { name: "Page" }).getAttribute("aria-selected")
    ).toBe("true")
  })

  it("opens on the Outline otherwise", () => {
    mount({ initialTab: undefined })
    expect(
      screen.getByRole("tab", { name: "Outline" }).getAttribute("aria-selected")
    ).toBe("true")
  })
})

describe("<PageTab> path", () => {
  it("explains a path that is not valid, and stops when it is", async () => {
    mount()
    const user = userEvent.setup()
    const path = within(panel()).getByLabelText("Path", { exact: true })
    await user.clear(path)
    await user.type(path, "About Us")
    expect(within(panel()).getByText(/must start with/i)).toBeTruthy()
    await user.clear(path)
    await user.type(path, "/about-us")
    expect(within(panel()).queryByText(/must start with/i)).toBeNull()
    expect(path.getAttribute("aria-invalid")).toBeNull()
  })

  it("does not let a reserved path through", async () => {
    mount()
    const user = userEvent.setup()
    const path = within(panel()).getByLabelText("Path", { exact: true })
    await user.clear(path)
    await user.type(path, "/admin")
    expect(within(panel()).getByText(/used by the app/i)).toBeTruthy()
  })

  it("moves a New Page's path with its title as it is typed, so a path filled in next replaces it whole", async () => {
    mount({
      id: null,
      initial: { ...about, title: "Untitled Page", path: "/untitled-page" },
    })
    const user = userEvent.setup()
    const title = within(panel()).getByLabelText("Title", { exact: true })
    const path = () =>
      (
        within(panel()).getByLabelText("Path", {
          exact: true,
        }) as HTMLInputElement
      ).value
    await user.clear(title)
    await user.type(title, "Our story")
    expect(path()).toBe("/our-story")
    // Emptied and typed again: still the title's path.
    await user.clear(title)
    await user.type(title, "Stays")
    expect(path()).toBe("/stays")
    // Once the path is written by hand it is the User's.
    await user.type(within(panel()).getByLabelText("Path"), "-x")
    await user.type(title, " by the sea")
    expect(path()).toBe("/stays-x")
  })

  it("gives a New Page the path of its title when the title is left", async () => {
    mount({
      id: null,
      initial: { ...about, title: "Untitled Page", path: "/untitled-page" },
    })
    const user = userEvent.setup()
    const title = within(panel()).getByLabelText("Title", { exact: true })
    await user.clear(title)
    await user.type(title, "Our story")
    await user.tab()
    expect(
      (
        within(panel()).getByLabelText("Path", {
          exact: true,
        }) as HTMLInputElement
      ).value
    ).toBe("/our-story")
  })

  it("leaves a saved Page's path alone when its title changes", async () => {
    mount()
    const user = userEvent.setup()
    const title = within(panel()).getByLabelText("Title", { exact: true })
    await user.clear(title)
    await user.type(title, "About the lodge")
    await user.tab()
    expect(
      (
        within(panel()).getByLabelText("Path", {
          exact: true,
        }) as HTMLInputElement
      ).value
    ).toBe("/about")
  })
})

describe("<PageTab> path change warning", () => {
  const uses = [
    {
      kind: "Page" as const,
      title: "Home",
      href: "/admin/pages/1",
      place: "Block 1, Button: Link: Link",
    },
    {
      kind: "Layout" as const,
      title: "Main",
      href: "/admin/layouts/3",
      place: "Footer Block 1, Legal bar: Link 2: Link: URL",
    },
  ]
  const retype = async (to: string) => {
    const user = userEvent.setup()
    const path = within(panel()).getByLabelText("Path", { exact: true })
    await user.clear(path)
    await user.type(path, to)
    return user
  }
  const notice = () => document.querySelector("[data-slot=path-change-notice]")

  it("lists what still links to the old path when a Published Page's path changes, and does not block saving", async () => {
    linkActions.linksToPath.mockResolvedValue(uses)
    mount({ status: "published" })
    await retype("/about-us")
    await waitFor(() => expect(notice()).not.toBeNull())
    const warning = within(notice() as HTMLElement)
    expect(warning.getByText(/2 links still lead to “\/about”/)).toBeTruthy()
    expect(
      warning.getByRole("link", { name: "Home" }).getAttribute("href")
    ).toBe("/admin/pages/1")
    expect(warning.getByText(/Layout, Footer Block 1/)).toBeTruthy()
    expect(
      warning.getByRole("link", { name: /Tools, Links/ }).getAttribute("href")
    ).toBe("/admin/tools/links")
    // The old path is asked about, once, however much is typed.
    expect(linkActions.linksToPath).toHaveBeenCalledTimes(1)
    expect(linkActions.linksToPath).toHaveBeenCalledWith("/about")
    expect(button(topBar(), "Save").disabled).toBe(false)
  })

  it("warns a Page with Changes not published, about the path visitors use and not its Draft's", async () => {
    linkActions.linksToPath.mockResolvedValue(uses)
    // The Draft was saved at /about-us; visitors are still served /about.
    mount({
      status: "changes",
      initial: { ...about, path: "/about-us" },
      publishedPath: "/about",
    })
    await waitFor(() => expect(notice()).not.toBeNull())
    expect(linkActions.linksToPath).toHaveBeenCalledWith("/about")
    // Typing another new path keeps asking about the Published one.
    await retype("/about-new")
    expect(
      within(notice() as HTMLElement).getByText(
        /2 links still lead to “\/about”/
      )
    ).toBeTruthy()
    expect(linkActions.linksToPath).toHaveBeenCalledTimes(1)
    expect(linkActions.linksToPath).not.toHaveBeenCalledWith("/about-us")
    expect(button(topBar(), "Save").disabled).toBe(false)
    // Describes the Path field, so it is read with it.
    const path = within(panel()).getByLabelText("Path", { exact: true })
    expect(path.getAttribute("aria-describedby")).toContain(
      (notice() as HTMLElement).id
    )
  })

  it('lists links for a "changes" Page whose path is edited away from the Published one', async () => {
    linkActions.linksToPath.mockResolvedValue(uses)
    mount({ status: "changes" })
    await retype("/about-us")
    await waitFor(() => expect(notice()).not.toBeNull())
    expect(linkActions.linksToPath).toHaveBeenCalledWith("/about")
    expect(button(topBar(), "Save").disabled).toBe(false)
  })

  it("goes when the path is put back", async () => {
    linkActions.linksToPath.mockResolvedValue(uses)
    mount({ status: "published" })
    await retype("/about-us")
    await waitFor(() => expect(notice()).not.toBeNull())
    await retype("/about")
    expect(notice()).toBeNull()
  })

  it("says nothing when nothing links to the old path", async () => {
    mount({ status: "published" })
    await retype("/about-us")
    await waitFor(() => expect(linkActions.linksToPath).toHaveBeenCalled())
    expect(notice()).toBeNull()
  })

  it("says nothing for a Draft or a New Page, and does not look", async () => {
    linkActions.linksToPath.mockResolvedValue(uses)
    mount({ status: "draft" })
    await retype("/about-us")
    cleanup()
    mount({ status: "published", id: null })
    await retype("/about-us")
    expect(notice()).toBeNull()
    expect(linkActions.linksToPath).not.toHaveBeenCalled()
  })

  it("says nothing when the lookup fails", async () => {
    linkActions.linksToPath.mockRejectedValue(new Error("down"))
    mount({ status: "published" })
    await retype("/about-us")
    await waitFor(() => expect(linkActions.linksToPath).toHaveBeenCalled())
    expect(notice()).toBeNull()
  })
})

describe("<PageTab> Layout mode", () => {
  it("says which Layout the path resolves to", () => {
    mount()
    const tab = panel()
    expect(
      (
        within(tab).getByRole("radio", {
          name: "Use the Layout for this path",
        }) as HTMLInputElement
      ).checked
    ).toBe(true)
    expect(within(tab).getByText("Uses Main, the default Layout.")).toBeTruthy()
  })

  it("follows the path as it is edited", async () => {
    mount()
    const user = userEvent.setup()
    const path = within(panel()).getByLabelText("Path", { exact: true })
    await user.clear(path)
    await user.type(path, "/stays/cabin")
    expect(
      within(panel()).getByText("Uses Listings, which covers /stays.")
    ).toBeTruthy()
    // The top bar's Edit Layout follows too.
    expect(
      within(topBar())
        .getByRole("link", { name: "Edit Layout" })
        .getAttribute("href")
    ).toBe("/admin/layouts/4")
  })

  it("picks a specific Layout", async () => {
    mount()
    const user = userEvent.setup()
    await user.click(
      within(panel()).getByRole("radio", { name: "A specific Layout" })
    )
    const select = within(panel()).getByRole("combobox", { name: /Layout/ })
    await user.selectOptions(select, "Listings")
    expect(within(panel()).getByText("Uses Listings.")).toBeTruthy()
    expect(
      within(topBar())
        .getByRole("link", { name: "Edit Layout" })
        .getAttribute("href")
    ).toBe("/admin/layouts/4")
    // It is an edit of the Page: there is something to save.
    expect(button(topBar(), "Save").disabled).toBe(false)
  })

  it("has No Layout, which leaves nothing around the Page", async () => {
    mount()
    const user = userEvent.setup()
    await user.click(within(panel()).getByRole("radio", { name: "No Layout" }))
    expect(
      within(panel()).getByText("Nothing is drawn around the Page.")
    ).toBeTruthy()
    expect(
      within(topBar()).queryByRole("link", { name: "Edit Layout" })
    ).toBeNull()
  })

  it("saves the choice with the Page", async () => {
    mount()
    const user = userEvent.setup()
    await user.click(within(panel()).getByRole("radio", { name: "No Layout" }))
    await user.click(button(topBar(), "Save"))
    await waitFor(() => expect(pages.savePage).toHaveBeenCalled())
    expect(pages.savePage.mock.calls[0]![0].document.layout).toEqual({
      mode: "none",
    })
  })

  it("cannot pick a specific Layout when there are none", () => {
    mount({ layouts: [] })
    expect(
      (
        within(panel()).getByRole("radio", {
          name: "A specific Layout",
        }) as HTMLInputElement
      ).disabled
    ).toBe(true)
    expect(
      within(panel()).getByText("There is no Layout to use yet.")
    ).toBeTruthy()
  })
})

describe("<PageTab> Make a new Layout from this one", () => {
  const made = option({ id: 9, name: "Lodge" })
  const make = () =>
    within(panel()).getByRole("button", {
      name: "Make a new Layout from this one",
    }) as HTMLButtonElement

  const askAndAnswer = async (name = "Lodge") => {
    const user = userEvent.setup()
    await user.click(make())
    const dialog = await screen.findByRole("dialog")
    const field = within(dialog).getByLabelText("Name")
    await user.clear(field)
    await user.type(field, name)
    await user.click(
      within(dialog).getByRole("button", { name: "Make Layout" })
    )
    return { user, dialog }
  }

  it("asks for a name, starting from the Layout's own with (copy)", async () => {
    mount()
    const user = userEvent.setup()
    await user.click(make())
    const dialog = await screen.findByRole("dialog")
    expect(
      (within(dialog).getByLabelText("Name") as HTMLInputElement).value
    ).toBe("Main (copy)")
  })

  it("copies the Layout the Page uses, and the Page switches to the copy", async () => {
    layoutActions.makeLayoutFromPageDocument.mockResolvedValue({
      ok: true,
      message: "Made “Lodge”.",
      layout: made,
    })
    mount({ status: "published" })
    await askAndAnswer()
    await waitFor(() =>
      expect(layoutActions.makeLayoutFromPageDocument).toHaveBeenCalledWith({
        pageId: 4,
        layoutId: 3,
        name: "Lodge",
      })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(toast.success).toHaveBeenCalledWith("Made “Lodge”.")
    expect(
      (
        within(panel()).getByRole("radio", {
          name: "A specific Layout",
        }) as HTMLInputElement
      ).checked
    ).toBe(true)
    expect(within(panel()).getByText("Uses Lodge.")).toBeTruthy()
    expect(
      within(topBar())
        .getByRole("link", { name: "Edit Layout" })
        .getAttribute("href")
    ).toBe("/admin/layouts/9")
  })

  it("is already saved in the Draft: nothing to save, but the Page has Changes not published", async () => {
    layoutActions.makeLayoutFromPageDocument.mockResolvedValue({
      ok: true,
      message: "Made.",
      layout: made,
    })
    mount({ status: "published" })
    await askAndAnswer()
    expect(
      await within(topBar()).findByText("Changes not published", {
        exact: true,
      })
    ).toBeTruthy()
    expect(button(topBar(), "Save").disabled).toBe(true)
    expect(button(topBar(), "Publish").disabled).toBe(false)
  })

  it("keeps other unsaved edits unsaved", async () => {
    layoutActions.makeLayoutFromPageDocument.mockResolvedValue({
      ok: true,
      message: "Made.",
      layout: made,
    })
    mount()
    const user = userEvent.setup()
    const title = within(panel()).getByLabelText("Title", { exact: true })
    await user.clear(title)
    await user.type(title, "About v2")
    await askAndAnswer()
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(button(topBar(), "Save").disabled).toBe(false)
    await user.click(button(topBar(), "Save"))
    await waitFor(() => expect(pages.savePage).toHaveBeenCalled())
    expect(pages.savePage.mock.calls[0]![0].document).toMatchObject({
      title: "About v2",
      layout: { mode: "layout", layoutId: 9 },
    })
  })

  it("keeps the dialog open and says why when the copy is refused", async () => {
    layoutActions.makeLayoutFromPageDocument.mockResolvedValue({
      ok: false,
      message: 'A Layout named "Lodge" already exists.',
    })
    mount()
    const { dialog } = await askAndAnswer()
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "already exists"
    )
    expect(screen.getByRole("dialog")).toBeTruthy()
    expect(toast.success).not.toHaveBeenCalled()
    // The Page is untouched behind the dialog, which hides it from the tree.
    expect(
      screen.getByRole("radio", {
        name: "Use the Layout for this path",
        hidden: true,
      })
    ).toMatchObject({ checked: true })
  })

  it("reports a failed request inline too", async () => {
    layoutActions.makeLayoutFromPageDocument.mockRejectedValue(
      new Error("offline")
    )
    mount()
    const { dialog } = await askAndAnswer()
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "Could not make the Layout"
    )
  })

  it("needs a name", async () => {
    mount()
    const user = userEvent.setup()
    await user.click(make())
    const dialog = await screen.findByRole("dialog")
    await user.clear(within(dialog).getByLabelText("Name"))
    expect(
      (
        within(dialog).getByRole("button", {
          name: "Make Layout",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
  })

  it("waits for a New Page to be saved", () => {
    mount({ id: null })
    expect(make().disabled).toBe(true)
    expect(within(panel()).getByText("Save the Page first.")).toBeTruthy()
  })

  it("has no Layout to copy for a Page with none", async () => {
    mount({ initial: { ...about, layout: { mode: "none" } } })
    expect(make().disabled).toBe(true)
    expect(
      within(panel()).getByText("The Page has no Layout to copy.")
    ).toBeTruthy()
  })
})

describe("<PageTab> SEO", () => {
  it("reads the field, its advice, then its count, and describes the field by both", () => {
    mount()
    const field = within(panel()).getByLabelText("SEO title")
    const advice = panel().querySelector("#page-seo-title-description")
    const count = panel().querySelector("#page-seo-title-count")
    expect(advice).toBeTruthy()
    expect(count).toBeTruthy()
    expect(
      field.compareDocumentPosition(advice as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      (advice as Node).compareDocumentPosition(count as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(field.getAttribute("aria-describedby")).toBe(
      "page-seo-title-description page-seo-title-count"
    )
  })

  it("counts the title and the description as they are typed", async () => {
    mount()
    const user = userEvent.setup()
    expect(within(panel()).getByText("0 / 60 characters")).toBeTruthy()
    expect(within(panel()).getByText("0 / 160 characters")).toBeTruthy()
    await user.type(within(panel()).getByLabelText("SEO title"), "Stay with us")
    expect(within(panel()).getByText("12 / 60 characters")).toBeTruthy()
    await user.type(within(panel()).getByLabelText("SEO description"), "Hello")
    expect(within(panel()).getByText("5 / 160 characters")).toBeTruthy()
  })

  it("warns, without blocking, when a title is too long", async () => {
    mount({
      initial: { ...about, seo: { ...about.seo, title: "x".repeat(61) } },
    })
    const counter = within(panel()).getByText(/61 \/ 60 characters/)
    expect(counter.textContent).toContain("may cut it off")
    expect(button(topBar(), "Publish").disabled).toBe(false)
  })

  it("turns the Page into a Page Template, which can't be published", async () => {
    mount({ initial: { ...about, isTemplate: false } })
    const user = userEvent.setup()
    expect(button(topBar(), "Publish").disabled).toBe(false)
    await user.click(within(panel()).getByLabelText("Use as a Page Template"))

    // Publish stays a keyboard stop while it is off.
    expect(button(topBar(), "Publish").getAttribute("aria-disabled")).toBe(
      "true"
    )
    await user.click(button(topBar(), "Save"))
    await waitFor(() => expect(pages.savePage).toHaveBeenCalled())
    expect(pages.savePage.mock.calls[0]![0]).toMatchObject({
      intent: "draft",
      document: { isTemplate: true },
    })
  })

  it("asks for a live Page to be unpublished before it is a Page Template", () => {
    mount({ status: "published" })
    const box = within(panel()).getByLabelText(
      "Use as a Page Template"
    ) as HTMLInputElement
    expect(box.disabled).toBe(true)
    expect(within(panel()).getByText(/Unpublish the Page first/)).toBeTruthy()
  })

  it("picks the share image from the Media", async () => {
    mount()
    const user = userEvent.setup()
    await user.click(within(panel()).getByLabelText("SEO image"))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "Beach" }))
    await user.click(button(topBar(), "Save"))
    await waitFor(() => expect(pages.savePage).toHaveBeenCalled())
    expect(pages.savePage.mock.calls[0]![0].document.seo.image).toBe(7)
  })
})

describe("<PageTab> saving problems", () => {
  it("shows a server's field error under the field", async () => {
    pages.savePage.mockResolvedValue({
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: { path: "Another Page uses this path." },
    })
    mount()
    const user = userEvent.setup()
    await user.clear(within(panel()).getByLabelText("Title", { exact: true }))
    await user.type(
      within(panel()).getByLabelText("Title", { exact: true }),
      "Other"
    )
    await user.click(button(topBar(), "Save"))
    expect(
      await within(panel()).findByText("Another Page uses this path.")
    ).toBeTruthy()
  })
})
