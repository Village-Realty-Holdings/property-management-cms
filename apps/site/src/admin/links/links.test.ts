import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { Layouts } from "../../collections/Layouts"
import { Pages } from "../../collections/Pages"
import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { applyReplace, previewReplace } from "../replace/run"
import { kindOf, linksIn, replaceLink, sitePath } from "./collect"
import { linksToPathAs } from "./pathLinks"
import { isBroken, linkReplacement, loadLinks } from "./screen"

const text = (value: string) => ({
  type: "text",
  version: 1,
  text: value,
  format: 0,
  detail: 0,
  mode: "normal",
  style: "",
})

const richWithLink = (url: string) => ({
  root: {
    type: "root",
    version: 1,
    direction: null,
    format: "",
    indent: 0,
    children: [
      {
        type: "paragraph",
        version: 1,
        direction: null,
        format: "",
        indent: 0,
        children: [
          text("Read "),
          {
            type: "link",
            version: 3,
            direction: null,
            format: "",
            indent: 0,
            fields: { linkType: "custom", newTab: false, url },
            children: [text("more")],
          },
        ],
      },
    ],
  },
})

describe("finding links", () => {
  it("finds a button's link, a link in rich text, and one inside a Container", () => {
    const page = {
      title: "Home /not-a-link",
      path: "/home",
      blocks: [
        {
          blockType: "hero",
          heading: "Hi",
          cta: { label: "Go", href: "/stays" },
        },
        {
          blockType: "richText",
          content: richWithLink("https://example.com/a"),
        },
        {
          blockType: "container",
          columns: "2",
          children: [
            {
              blockType: "button",
              link: { label: "Call", href: "tel:+15550100" },
            },
            { blockType: "button", link: { label: "Empty", href: "" } },
          ],
        },
      ],
    }
    expect(linksIn(Pages.fields, page)).toEqual([
      {
        target: { type: "url", url: "/stays" },
        block: "Block 1, Hero",
        where: "Call to action: Link",
      },
      {
        target: { type: "url", url: "https://example.com/a" },
        block: "Block 2, Rich text",
        where: "Content",
      },
      {
        target: { type: "url", url: "tel:+15550100" },
        block: "Block 3, Container, Column 1, Button",
        where: "Link: Link",
      },
    ])
  })

  it("counts a menu link's Page or its URL, whichever it shows", () => {
    const layout = {
      name: "Main",
      footer: [
        {
          blockType: "legalBar",
          text: "©",
          links: [
            {
              label: "Privacy",
              link: { type: "url", url: "/privacy", page: 9 },
            },
            { label: "About", link: { type: "page", page: 7, url: "/old" } },
          ],
        },
      ],
    }
    expect(linksIn(Layouts.fields, layout).map((link) => link.target)).toEqual([
      { type: "url", url: "/privacy" },
      { type: "page", pageId: 7 },
    ])
  })
})

describe("what kind of link a URL is", () => {
  it("tells internal, external, contact and anchor apart", () => {
    expect(kindOf("/stays")).toBe("internal")
    expect(kindOf("https://example.com")).toBe("external")
    expect(kindOf("mailto:hi@example.com")).toBe("contact")
    expect(kindOf("tel:+1555")).toBe("contact")
    expect(kindOf("#top")).toBe("anchor")
  })

  it("knows a full URL to this Site is internal", () => {
    const site = "https://seaglass.test"
    expect(kindOf("https://seaglass.test/stays/", site)).toBe("internal")
    expect(sitePath("https://seaglass.test/stays/?a=1#b", site)).toBe("/stays")
    expect(kindOf("https://other.test/stays", site)).toBe("external")
  })

  it("reads a path without its query, anchor or last slash", () => {
    expect(sitePath("/stays/?room=2#top")).toBe("/stays")
    expect(sitePath("/")).toBe("/")
    expect(sitePath("//evil.test")).toBeNull()
  })
})

describe("replacing a link", () => {
  it("changes the URL where it is stored exactly, in fields and rich text", () => {
    const page = {
      title: "/old",
      blocks: [
        {
          blockType: "hero",
          heading: "/old",
          cta: { label: "/old", href: "/old" },
        },
        { blockType: "richText", content: richWithLink("/old") },
        { blockType: "button", link: { label: "Other", href: "/older" } },
      ],
    }
    const { data, hits } = replaceLink(Pages.fields, page, {
      from: "/old",
      to: "/new",
    })
    expect(hits.map((hit) => [hit.block, hit.where])).toEqual([
      ["Block 1, Hero", "Call to action: Link"],
      ["Block 2, Rich text", "Content"],
    ])
    expect(data).toMatchObject({
      title: "/old",
      blocks: [
        { heading: "/old", cta: { label: "/old", href: "/new" } },
        { content: richWithLink("/new") },
        { link: { href: "/older" } },
      ],
    })
  })

  it("needs a new link that the Site accepts", () => {
    expect(linkReplacement({ from: "", to: "/a" })).toMatchObject({
      ok: false,
      message: "Choose the link to replace.",
    })
    expect(linkReplacement({ from: "/a", to: " " })).toMatchObject({
      ok: false,
      message: "Enter the link to use instead.",
    })
    expect(linkReplacement({ from: "/a", to: "/a" }).ok).toBe(false)
    expect(
      linkReplacement({ from: "/a", to: "javascript:alert(1)" })
    ).toMatchObject({
      ok: false,
      message: expect.stringContaining("Site path"),
    })
    expect(linkReplacement({ from: "/a", to: "/b" }).ok).toBe(true)
  })
})

describe("the Links list", () => {
  let t: TestPayload
  let asUser: { overrideAccess: false; user: User & { collection: "users" } }

  beforeAll(async () => {
    t = await getTestPayload()
    const user = await t.payload.create({
      collection: "users",
      data: { email: "staff@awayday.test", registryUserId: 368570 },
    })
    asUser = { overrideAccess: false, user: { ...user, collection: "users" } }

    const about = await t.payload.create({
      collection: "pages",
      data: { title: "About", path: "/about", _status: "published" },
      ...asUser,
    })
    await t.payload.create({
      collection: "pages",
      data: { title: "Soon", path: "/soon", _status: "draft" },
      draft: true,
      ...asUser,
    })
    const button = (label: string, href: string) => ({
      blockType: "button" as const,
      link: { label, href },
      style: "primary" as const,
      align: "start" as const,
    })
    await t.payload.create({
      collection: "pages",
      data: {
        title: "Home",
        path: "/",
        _status: "published",
        blocks: [
          button("About", "/about/"),
          button("Soon", "/soon"),
          button("Gone", "/gone"),
          button("Out", "https://example.com"),
          button("Media", "/media/file.pdf"),
        ],
      },
      ...asUser,
    })
    await t.payload.create({
      collection: "pages",
      data: {
        title: "Starter",
        path: "/starter",
        isTemplate: true,
        _status: "draft",
        blocks: [button("Gone", "/gone")],
      },
      draft: true,
      ...asUser,
    })
    await t.payload.create({
      collection: "layouts",
      data: {
        name: "Main",
        footer: [
          {
            blockType: "legalBar",
            text: "©",
            links: [
              { label: "About", link: { type: "page", page: about.id } },
              { label: "Gone", link: { type: "url", url: "/gone" } },
            ],
          },
        ],
      },
      ...asUser,
    })
  })

  afterAll(async () => {
    await t?.teardown()
  })

  it("groups links by target, broken ones first, with where each is", async () => {
    const rows = await loadLinks(t.payload, asUser)
    expect(
      rows.map((row) => [row.target, row.kind, row.status, row.uses.length])
    ).toEqual([
      ["/gone", "internal", "missing", 3],
      ["/soon", "internal", "unpublished", 1],
      ["/about/", "internal", "ok", 1],
      ["/media/file.pdf", "internal", "ok", 1],
      ["https://example.com", "external", "unchecked", 1],
      ["Page: About (/about)", "internal", "ok", 1],
    ])
    expect(rows.filter(isBroken).map((row) => row.problem)).toEqual([
      "No Page has this path.",
      "The Page at this path is not published.",
    ])
    expect(rows[0]!.uses).toEqual([
      {
        kind: "Page",
        title: "Home",
        href: expect.stringMatching(/^\/admin\/pages\/\d+$/),
        place: "Block 3, Button: Link: Link",
      },
      expect.objectContaining({ kind: "Page Template", title: "Starter" }),
      {
        kind: "Layout",
        title: "Main",
        href: expect.stringMatching(/^\/admin\/layouts\/\d+$/),
        place: "Footer Block 1, Legal bar: Link 2: Link: URL",
      },
    ])
    // A menu link to a Page can't be replaced as a URL: it follows its Page.
    expect(rows.at(-1)!.url).toBeNull()
  })

  it("replaces a URL on Pages and Layouts, and leaves Page Templates alone", async () => {
    const loaded = linkReplacement({ from: "/gone", to: "/about" })
    if (!loaded.ok) throw new Error(loaded.message)
    const preview = await previewReplace(t.payload, asUser, loaded.replacement)
    expect(preview.rows.map((row) => [row.kind, row.title, row.live])).toEqual([
      ["Page", "Home", false],
      ["Layout", "Main", true],
    ])
    const result = await applyReplace(
      t.payload,
      asUser,
      loaded.replacement,
      "publish"
    )
    expect(result).toMatchObject({
      ok: true,
      message: "Replaced in 1 Page and 1 Layout.",
    })
    const rows = await loadLinks(t.payload, asUser)
    expect(rows.find((row) => row.target === "/gone")?.uses).toMatchObject([
      { kind: "Page Template", title: "Starter" },
    ])
    expect(rows.find((row) => row.target === "/about")).toMatchObject({
      status: "ok",
      uses: [{ title: "Home" }, { title: "Main" }],
    })
  })
})

describe("what links to a path", () => {
  let t: TestPayload
  let asUser: { overrideAccess: false; user: User & { collection: "users" } }

  beforeAll(async () => {
    t = await getTestPayload()
    const user = await t.payload.create({
      collection: "users",
      data: { email: "path@awayday.test", registryUserId: 190999 },
    })
    asUser = { overrideAccess: false, user: { ...user, collection: "users" } }
    const button = (href: string) => ({
      blockType: "button" as const,
      link: { label: "Go", href },
      style: "primary" as const,
      align: "start" as const,
    })
    const stays = await t.payload.create({
      collection: "pages",
      data: { title: "Stays", path: "/stays", _status: "published" },
      ...asUser,
    })
    await t.payload.create({
      collection: "pages",
      data: {
        title: "Home",
        path: "/",
        _status: "published",
        blocks: [
          button("/stays/"),
          button("https://site.test/stays#rooms"),
          button("/about"),
        ],
      },
      ...asUser,
    })
    await t.payload.create({
      collection: "layouts",
      data: {
        name: "Main",
        footer: [
          {
            blockType: "legalBar",
            text: "©",
            links: [
              { label: "Stays", link: { type: "url", url: "/stays" } },
              { label: "Stays", link: { type: "page", page: stays.id } },
            ],
          },
        ],
      },
      ...asUser,
    })
  })

  afterAll(async () => {
    await t?.teardown()
  })

  it("lists every use of the path, however the link is spelled, and leaves menu links to Pages out", async () => {
    const uses = await linksToPathAs(t.payload, asUser, "/stays", {
      siteUrl: "https://site.test",
    })
    expect(uses.map((use) => [use.kind, use.title])).toEqual([
      ["Layout", "Main"],
      ["Page", "Home"],
      ["Page", "Home"],
    ])
    expect(uses[1]).toMatchObject({
      href: expect.stringMatching(/^\/admin\/pages\/\d+$/),
      place: "Block 1, Button: Link: Link",
    })
  })

  it("finds nothing for a path nothing links to, or one that is not a path", async () => {
    expect(await linksToPathAs(t.payload, asUser, "/nobody")).toEqual([])
    expect(await linksToPathAs(t.payload, asUser, "not a path")).toEqual([])
  })
})
