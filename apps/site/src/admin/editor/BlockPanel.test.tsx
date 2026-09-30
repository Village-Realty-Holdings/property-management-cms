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
import type { Block } from "payload"
import { useEffect } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

// Only the icons on screen are loaded in the Site; the test needs a short,
// known list it can search.
vi.mock("lucide-react/dynamic", () => ({
  iconNames: ["wifi", "waves", "paw-print", "car"],
  DynamicIcon: ({ name }: { name: string }) => (
    <svg data-icon={name} aria-hidden />
  ),
}))

import { Hero } from "../../blocks/Hero"
import { Navigation } from "../../blocks/region/Navigation"
import { HeaderActions } from "../../blocks/region/HeaderActions"
import { RichText } from "../../blocks/RichText"
import type { MediaOption } from "../components/MediaSelect"
import type { BlockValues } from "../pageForm"
import { BlockPanel } from "./BlockPanel"
import { EditorProvider, useEditor } from "./EditorProvider"
import type { PageOption } from "./fields/context"
import type { EditorDocument } from "./state"

// The real Testimonials Block belongs to the Block catalogue; this one has
// the shape the spec gives it, so the panel is tested against a Block that
// mixes an array, a number range and a select.
const Testimonials: Block = {
  slug: "testimonials",
  labels: { singular: "Testimonials", plural: "Testimonials" },
  fields: [
    { name: "heading", type: "text" },
    {
      name: "display",
      label: "Show as",
      type: "select",
      required: true,
      defaultValue: "carousel",
      options: [
        { label: "Carousel", value: "carousel" },
        { label: "Grid", value: "grid" },
      ],
    },
    {
      name: "items",
      label: "Testimonials",
      type: "array",
      minRows: 1,
      maxRows: 3,
      labels: { singular: "Testimonial", plural: "Testimonials" },
      fields: [
        { name: "quote", type: "textarea", required: true },
        {
          type: "row",
          fields: [
            { name: "name", type: "text", required: true },
            { name: "role", label: "Role line", type: "text" },
          ],
        },
        {
          name: "rating",
          label: "Star rating",
          type: "number",
          min: 1,
          max: 5,
          admin: { description: "From 1 to 5 stars." },
        },
      ],
    },
  ],
}

// A Block with an icon picker and a relationship, as the Features Block has.
const Features: Block = {
  slug: "features",
  labels: { singular: "Features", plural: "Features" },
  fields: [
    {
      name: "features",
      type: "array",
      fields: [
        { name: "icon", type: "text" },
        { name: "title", type: "text", required: true },
      ],
    },
    {
      name: "more",
      label: "Read more page",
      type: "relationship",
      relationTo: "pages",
    },
  ],
}

const blocks = [
  Hero,
  Navigation,
  HeaderActions,
  Testimonials,
  Features,
  RichText,
]

const media: MediaOption[] = [
  { id: 7, label: "Beach (beach.jpg)", url: "/media/beach.jpg" },
  { id: 8, label: "Dunes (dunes.jpg)", url: null },
]
const pages: PageOption[] = [
  { id: 1, title: "Home", path: "/" },
  { id: 2, title: "About us", path: "/about" },
  { id: 3, title: "Contact", path: "/contact" },
]

beforeAll(() => {
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  Object.assign(globalThis, { ResizeObserver: Observer })
  Element.prototype.scrollIntoView ??= () => {}
})
afterEach(cleanup)

const hero = {
  blockType: "hero",
  heading: "Welcome",
  subheading: "",
  image: null,
  cta: { label: "Book", href: "/book" },
}
const navigation = {
  blockType: "navigation",
  items: [
    { label: "Home", link: { type: "page", page: 1, url: "" } },
    { label: "Stay", link: { type: "url", page: null, url: "/stay" } },
  ],
}
const testimonials = {
  blockType: "testimonials",
  heading: "Guests say",
  display: "grid",
  items: [
    { quote: "Lovely.", name: "Ann", role: "Guest", rating: 5 },
    { quote: "Great.", name: "Bo", role: "", rating: 4 },
  ],
}

function Select({ index }: { index: number }) {
  const { doc, select } = useEditor()
  useEffect(() => {
    const id = (doc as { blocks: { id?: string }[] }).blocks[index]?.id
    if (id) select(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

const Probe = () => {
  const { doc, canUndo } = useEditor()
  return (
    <>
      <output data-testid="doc">{JSON.stringify(doc)}</output>
      <output data-testid="undo">{String(canUndo)}</output>
    </>
  )
}

const mount = (block: object, { select = 0 }: { select?: number } = {}) => {
  const initial: EditorDocument = {
    kind: "page",
    title: "Home",
    path: "/",
    layout: { mode: "default" },
    blocks: [block as unknown as BlockValues],
    seo: { title: "", description: "", image: null },
  }
  return render(
    <EditorProvider initial={initial}>
      <Select index={select} />
      <BlockPanel blocks={blocks} media={media} pages={pages} />
      <Probe />
    </EditorProvider>
  )
}

const block = () =>
  (
    JSON.parse(screen.getByTestId("doc").textContent!) as {
      blocks: Record<string, unknown>[]
    }
  ).blocks[0]!

describe("<BlockPanel>", () => {
  it("asks for a selection when no Block is selected", () => {
    const initial: EditorDocument = {
      kind: "page",
      title: "Home",
      path: "/",
      layout: { mode: "default" },
      blocks: [],
      seo: { title: "", description: "", image: null },
    }
    render(
      <EditorProvider initial={initial}>
        <BlockPanel blocks={blocks} />
      </EditorProvider>
    )
    expect(
      screen.getByText("Select a Block to edit its settings.")
    ).toBeTruthy()
  })

  describe("Hero", () => {
    it("shows the settings from the Block's config", () => {
      mount(hero)
      expect(screen.getByRole("form", { name: "Hero settings" })).toBeTruthy()
      expect(
        (screen.getByLabelText("Heading", { exact: true }) as HTMLInputElement)
          .value
      ).toBe("Welcome")
      expect(screen.getByLabelText("Subheading")).toBeTruthy()
      expect(screen.getByLabelText("Image")).toBeTruthy()
      const cta = screen.getByRole("group", { name: "Call to action" })
      expect(
        (within(cta).getByLabelText("Label") as HTMLInputElement).value
      ).toBe("Book")
      expect(
        (within(cta).getByLabelText("Link") as HTMLInputElement).value
      ).toBe("/book")
      expect(within(cta).getByText(/Site path like/)).toBeTruthy()
    })

    it("dispatches a change as soon as it is typed", async () => {
      const user = userEvent.setup()
      mount(hero)
      await user.type(screen.getByLabelText("Heading", { exact: true }), "!")
      expect(block().heading).toBe("Welcome!")
      expect(screen.getByTestId("undo").textContent).toBe("true")
    })

    it("edits a field inside a group", async () => {
      const user = userEvent.setup()
      mount(hero)
      const cta = screen.getByRole("group", { name: "Call to action" })
      await user.clear(within(cta).getByLabelText("Label"))
      await user.type(within(cta).getByLabelText("Label"), "Stay")
      expect(block().cta).toEqual({ label: "Stay", href: "/book" })
    })

    it("picks an image from Media", async () => {
      const user = userEvent.setup()
      mount(hero)
      await user.selectOptions(screen.getByLabelText("Image"), "7")
      expect(block().image).toBe(7)
      await user.selectOptions(screen.getByLabelText("Image"), "")
      expect(block().image).toBeNull()
    })

    it("shows a required field's message once it is emptied", async () => {
      const user = userEvent.setup()
      mount(hero)
      const heading = screen.getByLabelText("Heading", { exact: true })
      expect(screen.queryByRole("alert")).toBeNull()
      await user.clear(heading)
      expect((await screen.findByRole("alert")).textContent).toBe(
        "This field is required."
      )
      expect(heading.getAttribute("aria-invalid")).toBe("true")
      expect(heading.getAttribute("aria-describedby")).toContain(
        screen.getByRole("alert").id
      )
    })

    it("shows the field's own validation message inline", async () => {
      const user = userEvent.setup()
      mount(hero)
      const cta = screen.getByRole("group", { name: "Call to action" })
      await user.clear(within(cta).getByLabelText("Link"))
      await user.type(within(cta).getByLabelText("Link"), "not a link")
      expect(within(cta).getByRole("alert").textContent).toContain(
        "Use a Site path"
      )
    })

    it("writes a field the Block was stored without", async () => {
      const user = userEvent.setup()
      const { subheading: _subheading, ...stored } = hero
      void _subheading
      mount(stored)
      await user.type(screen.getByLabelText("Subheading"), "Sun")
      expect(block().subheading).toBe("Sun")
    })
  })

  describe("Navigation", () => {
    const row = (n: number) =>
      screen.getAllByRole("group", { name: `Item ${n}` })[0]!

    it("shows each item, with the link's conditional fields", () => {
      mount(navigation)
      const first = row(1)
      expect(
        (within(first).getByLabelText("Label") as HTMLInputElement).value
      ).toBe("Home")
      // A link to a Page shows the Page picker and hides the URL.
      expect(
        within(first).getByRole("radio", { name: "A Page" })
      ).toHaveProperty("checked", true)
      expect(
        within(first).getByRole("button", { name: "Page: Home" })
      ).toBeTruthy()
      expect(within(first).queryByLabelText("URL")).toBeNull()
      // A link to a URL shows the URL and hides the Page picker.
      const second = row(2)
      expect(
        (within(second).getByLabelText("URL") as HTMLInputElement).value
      ).toBe("/stay")
      expect(within(second).queryByText("Choose a Page")).toBeNull()
    })

    it("switching the link type swaps the fields", async () => {
      const user = userEvent.setup()
      mount(navigation)
      const first = row(1)
      await user.click(within(first).getByRole("radio", { name: "A URL" }))
      expect(within(first).getByLabelText("URL")).toBeTruthy()
      expect(
        (block().items as { link: { type: string } }[])[0]!.link.type
      ).toBe("url")
    })

    it("hides the dropdown style until the item has dropdown links", async () => {
      const user = userEvent.setup()
      const { container } = mount(navigation)
      const first = row(1)
      expect(within(first).queryByLabelText("Show the dropdown as")).toBeNull()
      await user.click(
        within(first).getByRole("button", {
          name: "Add item to Dropdown links",
        })
      )
      const items = block().items as {
        children: unknown[]
        link: unknown
      }[]
      expect(items[0]!.children).toHaveLength(1)
      expect(within(row(1)).getByLabelText("Show the dropdown as")).toBeTruthy()
      // The item no longer links anywhere itself.
      expect(
        container.querySelector('input[name$="items-0-link-type"]')
      ).toBeNull()
    })

    it("adds a row with the fields' defaults", async () => {
      const user = userEvent.setup()
      mount(navigation)
      await user.click(
        screen.getByRole("button", { name: "Add item to Items" })
      )
      const items = block().items as Record<string, unknown>[]
      expect(items).toHaveLength(3)
      expect(items[2]).toMatchObject({
        label: "",
        link: { type: "page", page: null, url: "" },
        display: "dropdown",
        children: [],
      })
      expect(screen.getByRole("group", { name: "Item 3" })).toBeTruthy()
      // Focus moves to the new row's first control.
      await waitFor(() =>
        expect(document.activeElement).toBe(
          within(row(3)).getByLabelText("Label")
        )
      )
    })

    it("removes a row", async () => {
      const user = userEvent.setup()
      mount(navigation)
      await user.click(
        screen.getByRole("button", { name: "Remove Item 1 from Items" })
      )
      const items = block().items as { label: string }[]
      expect(items.map((i) => i.label)).toEqual(["Stay"])
      expect(screen.queryByRole("group", { name: "Item 2" })).toBeNull()
    })

    it("reorders rows", async () => {
      const user = userEvent.setup()
      mount(navigation)
      expect(
        screen.getByRole("button", { name: "Move Item 1 up in Items" })
      ).toHaveProperty("disabled", true)
      await user.click(
        screen.getByRole("button", { name: "Move Item 1 down in Items" })
      )
      const items = block().items as { label: string }[]
      expect(items.map((i) => i.label)).toEqual(["Stay", "Home"])
      expect(
        (within(row(1)).getByLabelText("Label") as HTMLInputElement).value
      ).toBe("Stay")
    })

    it("stops adding at the most rows", async () => {
      const user = userEvent.setup()
      mount({
        blockType: "navigation",
        items: Array.from({ length: 11 }, (_, i) => ({
          label: `Item ${i}`,
          link: { type: "url", page: null, url: "" },
        })),
      })
      const add = screen.getByRole("button", { name: "Add item to Items" })
      expect(screen.getByText("11 of 12")).toBeTruthy()
      await user.click(add)
      expect(screen.getByText("12 of 12")).toBeTruthy()
      expect(add).toHaveProperty("disabled", true)
    })

    it("searches Pages to link to", async () => {
      const user = userEvent.setup()
      mount(navigation)
      await user.click(
        within(row(1)).getByRole("button", {
          name: "Page: Home",
          expanded: false,
        })
      )
      await user.type(
        screen.getByRole("combobox", { name: "Search Pages" }),
        "abo"
      )
      expect(screen.queryByRole("option", { name: /Contact/ })).toBeNull()
      await user.click(screen.getByRole("option", { name: /About us/ }))
      expect(
        (block().items as { link: { page: number } }[])[0]!.link.page
      ).toBe(2)
    })
  })

  describe("Testimonials", () => {
    it("shows the array, its rows and their field rules", () => {
      mount(testimonials)
      expect(screen.getByLabelText("Show as")).toHaveProperty("value", "grid")
      const first = screen.getByRole("group", { name: "Testimonial 1" })
      expect(
        (within(first).getByLabelText("Quote") as HTMLTextAreaElement).value
      ).toBe("Lovely.")
      expect(
        (within(first).getByLabelText("Name") as HTMLInputElement).value
      ).toBe("Ann")
      const rating = within(first).getByLabelText("Star rating")
      expect(rating.getAttribute("min")).toBe("1")
      expect(rating.getAttribute("max")).toBe("5")
      expect(within(first).getByText("From 1 to 5 stars.")).toBeTruthy()
      expect(screen.getByText("2 of 3, at least 1")).toBeTruthy()
    })

    it("shows a select's default when the Block has no value", () => {
      const { display: _display, ...stored } = testimonials
      void _display
      mount(stored)
      expect(screen.getByLabelText("Show as")).toHaveProperty(
        "value",
        "carousel"
      )
    })

    it("edits a number and validates its range", async () => {
      const user = userEvent.setup()
      mount(testimonials)
      const first = screen.getByRole("group", { name: "Testimonial 1" })
      const rating = within(first).getByLabelText("Star rating")
      await user.clear(rating)
      await user.type(rating, "9")
      expect((block().items as { rating: number }[])[0]!.rating).toBe(9)
      expect(within(first).getByRole("alert").textContent).toBe(
        "Use a number of 5 or less."
      )
    })

    it("keeps the last row when the array needs one", async () => {
      const user = userEvent.setup()
      mount({ ...testimonials, items: [testimonials.items[0]] })
      expect(
        screen.getByRole("button", {
          name: "Remove Testimonial 1 from Testimonials",
        })
      ).toHaveProperty("disabled", true)
      await user.click(
        screen.getByRole("button", { name: "Add testimonial to Testimonials" })
      )
      expect(block().items).toHaveLength(2)
    })

    it("changes a select", async () => {
      const user = userEvent.setup()
      mount(testimonials)
      await user.selectOptions(screen.getByLabelText("Show as"), "carousel")
      expect(block().display).toBe("carousel")
    })
  })

  describe("conditions", () => {
    it("hides a field until its condition holds", async () => {
      const user = userEvent.setup()
      mount({
        blockType: "headerActions",
        showPhone: true,
        phone: "",
        button: { label: "", href: "" },
        login: { label: "", href: "" },
      })
      expect(screen.getByLabelText("Phone number")).toBeTruthy()
      await user.click(screen.getByLabelText("Show a phone number"))
      expect(block().showPhone).toBe(false)
      expect(screen.queryByLabelText("Phone number")).toBeNull()
      await user.click(screen.getByLabelText("Show a phone number"))
      expect(screen.getByLabelText("Phone number")).toBeTruthy()
    })

    it("shows a checkbox's description and group labels", () => {
      mount({
        blockType: "headerActions",
        showPhone: true,
        phone: "",
        button: { label: "", href: "" },
        login: { label: "", href: "" },
      })
      expect(
        screen.getByText("Leave empty to show the Brand's phone number.")
      ).toBeTruthy()
      expect(screen.getByRole("group", { name: "Login link" })).toBeTruthy()
      expect(screen.getByRole("group", { name: "Button" })).toBeTruthy()
    })
  })

  describe("icons", () => {
    const features = {
      blockType: "features",
      features: [{ icon: "wifi", title: "Wi-Fi" }],
      more: null,
    }

    it("shows the chosen icon by name, with a preview", () => {
      mount(features)
      const button = screen.getByRole("button", { name: "Icon: wifi" })
      expect(button.querySelector("svg[data-icon='wifi']")).toBeTruthy()
    })

    it("searches icons by name and previews each", async () => {
      const user = userEvent.setup()
      mount(features)
      await user.click(screen.getByRole("button", { name: "Icon: wifi" }))
      await user.type(
        screen.getByRole("combobox", { name: "Search icons" }),
        "pa"
      )
      const option = await screen.findByRole("option", { name: /paw print/i })
      expect(option.querySelector("svg[data-icon='paw-print']")).toBeTruthy()
      expect(screen.queryByRole("option", { name: /car/i })).toBeNull()
      await user.click(option)
      expect((block().features as { icon: string }[])[0]!.icon).toBe(
        "paw-print"
      )
    })

    it("clears the icon", async () => {
      const user = userEvent.setup()
      mount(features)
      await user.click(screen.getByRole("button", { name: "Icon: wifi" }))
      await user.click(await screen.findByRole("option", { name: "No icon" }))
      expect((block().features as { icon: string }[])[0]!.icon).toBe("")
    })
  })

  describe("other Blocks", () => {
    it("says where rich text is edited", () => {
      mount({ blockType: "richText", markdown: "Hi" })
      expect(screen.getByText(/edited on the page itself/)).toBeTruthy()
    })

    it("says so when the Block has no config", () => {
      mount({ blockType: "mystery" })
      expect(
        screen.getByText("This Block has no settings to edit.")
      ).toBeTruthy()
    })

    it("follows the selection", async () => {
      const initial: EditorDocument = {
        kind: "page",
        title: "Home",
        path: "/",
        layout: { mode: "default" },
        blocks: [hero, testimonials] as unknown as BlockValues[],
        seo: { title: "", description: "", image: null },
      }
      function Switcher() {
        const { doc, select } = useEditor()
        return (doc as { blocks: { id: string }[] }).blocks.map((b, i) => (
          <button key={b.id} type="button" onClick={() => select(b.id)}>
            Select {i + 1}
          </button>
        ))
      }
      const user = userEvent.setup()
      render(
        <EditorProvider initial={initial}>
          <Switcher />
          <BlockPanel blocks={blocks} media={media} pages={pages} />
        </EditorProvider>
      )
      await user.click(screen.getByRole("button", { name: "Select 1" }))
      expect(screen.getByRole("form", { name: "Hero settings" })).toBeTruthy()
      await user.click(screen.getByRole("button", { name: "Select 2" }))
      expect(
        screen.getByRole("form", { name: "Testimonials settings" })
      ).toBeTruthy()
    })
  })

  describe("accessibility", () => {
    it.each([
      ["Hero", hero],
      ["Navigation", navigation],
      ["Testimonials", testimonials],
      [
        "Features",
        { blockType: "features", features: [{ icon: "", title: "" }], more: 2 },
      ],
    ])("has no axe violations for %s", async (_name, value) => {
      const { container } = mount(value)
      const results = await axe.run(container, {
        // jsdom has no layout or paint, so contrast is checked in the browser.
        rules: { "color-contrast": { enabled: false } },
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      })
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    })

    it("has no axe violations with errors showing", async () => {
      const user = userEvent.setup()
      const { container } = mount(hero)
      await user.clear(screen.getByLabelText("Heading", { exact: true }))
      const results = await axe.run(container, {
        rules: { "color-contrast": { enabled: false } },
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      })
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    })
  })
})
