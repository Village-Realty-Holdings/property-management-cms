import type { APIRequestContext, APIResponse } from "playwright-core"

import { ORIGIN } from "../../theme/support/env"

/**
 * The Layouts acceptance tests' handle on the Site's data: Payload's REST API
 * (`/api/...`), called as the signed-in User with the browser context's
 * session cookie. Everything the tests check is then read back through the
 * browser (the Site and the Admin) or over HTTP; nothing here imports the
 * Site's code.
 *
 * The spec (docs/plans/site-builder-milestone.md, Phase 3) names the fields:
 * a Layout's `name`, `header`, `footer`, `paths` and `isDefault`, and a Page's
 * `layout` with the modes `route`, `specific` and `none`. It does not spell
 * out their exact JSON shape, nor the shape of each region Block. This file
 * is the one place that does. If the build settles on a different shape,
 * change it here (in `pageLayoutField`, `pathsField`, `readPaths`, `blocks`,
 * `nav`, `column` and the link helpers), never in the specs.
 */

export type Json = Record<string, unknown>
export type Doc = Json & { id: number }
export type Block = Json & { blockType: string }

// --- Field shapes ---------------------------------------------------------

/** The Layout a Page picks (the Page's `layout` field). */
export type LayoutChoice =
  | { mode: "route" }
  | { mode: "none" }
  | { mode: "specific"; layout: number }

/** The Page's `layout` field, as sent to the API. */
export function pageLayoutField(choice: LayoutChoice): Json {
  return {
    layout:
      choice.mode === "specific"
        ? { mode: "specific", layout: choice.layout }
        : { mode: choice.mode },
  }
}

/** A Layout's `paths` (a list of path prefixes), as sent to the API. */
export function pathsField(paths: readonly string[]): Json[] {
  return paths.map((path) => ({ path }))
}

/** A Layout's `paths`, as the API returns them. */
export function readPaths(layout: Json): string[] {
  const value = layout.paths
  if (!Array.isArray(value)) return []
  return value.map((row: unknown) =>
    typeof row === "string" ? row : String((row as Json).path)
  )
}

/** A menu link: to a Page (by relationship, so it follows the Page) or a URL. */
export type MenuLink =
  | { type: "page"; page: number }
  | { type: "url"; url: string }

export const pageLink = (page: number): MenuLink => ({ type: "page", page })
export const urlLink = (url: string): MenuLink => ({ type: "url", url })

/** A button (`{ label, href }`), as the existing Blocks' buttons are. */
export type Button = { label: string; href: string }

/** Items of the Navigation Block: links, and one level of dropdowns. */
export const nav = {
  link: (label: string, link: MenuLink): Json => ({ label, link }),
  /** A dropdown of links; `mega` shows it as mega-menu columns. */
  dropdown: (
    label: string,
    children: Json[],
    { mega = false }: { mega?: boolean } = {}
  ): Json => ({ label, display: mega ? "mega" : "dropdown", children }),
}

/** Columns of the Footer columns Block. */
export const column = {
  links: (heading: string, links: Json[]): Json => ({
    heading,
    content: "links",
    links,
  }),
  /** The Brand's address. */
  address: (heading: string): Json => ({ heading, content: "address" }),
  hours: (heading: string, hours: string): Json => ({
    heading,
    content: "hours",
    hours,
  }),
  /** The Brand's social links. */
  social: (heading: string): Json => ({ heading, content: "social" }),
}

/** The region Blocks, and the shared Blocks a Footer may also use. */
export const blocks = {
  // Header only.
  /** The Brand's logo (or name), linking Home. */
  logo: (): Block => ({ blockType: "logo" }),
  navigation: (items: Json[]): Block => ({ blockType: "navigation", items }),
  headerActions: (actions: {
    phone?: string
    button?: Button
    login?: Button
  }): Block => ({ blockType: "headerActions", ...actions }),
  utilityStrip: (text: string): Block => ({ blockType: "utilityStrip", text }),
  // Footer only.
  footerColumns: (columns: Json[]): Block => ({
    blockType: "footerColumns",
    columns,
  }),
  legalBar: (text: string): Block => ({ blockType: "legalBar", text }),
  // Shared Blocks also allowed in a Footer.
  newsletter: (heading: string, text: string): Block => ({
    blockType: "newsletter",
    heading,
    text,
  }),
  callToAction: (heading: string, button: Button): Block => ({
    blockType: "callToAction",
    heading,
    button,
    style: "primary",
  }),
}

/**
 * Text a Layout shows in its Header, to tell which Layout a Page got. The
 * quotes keep one mark from containing another ("Stays" in "Stays north").
 */
export const headerMark = (name: string) => `Header of “${name}”`
/** Text a Layout shows in its Footer. */
export const footerMark = (name: string) => `Footer of “${name}”`

/** A Header and Footer that say which Layout they belong to. */
export function markedRegions(name: string): {
  header: Block[]
  footer: Block[]
} {
  return {
    header: [blocks.utilityStrip(headerMark(name))],
    footer: [blocks.legalBar(footerMark(name))],
  }
}

// --- The API --------------------------------------------------------------

export type LayoutInput = {
  name: string
  header?: Block[]
  footer?: Block[]
  paths?: readonly string[]
  isDefault?: boolean
}

export type PageInput = {
  title: string
  path: string
  /** Left out: the Page is created without the field (its default mode). */
  layout?: LayoutChoice
}

/** The body of a response, as text, for failure messages and error checks. */
export async function bodyText(response: APIResponse): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ""
  }
}

async function json<T>(response: APIResponse, what: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(
      `${what} failed: ${response.status()} ${await bodyText(response)}`
    )
  }
  return (await response.json()) as T
}

function query(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&")
}

function layoutBody(input: Partial<LayoutInput>): Json {
  const { paths, ...rest } = input
  return paths ? { ...rest, paths: pathsField(paths) } : rest
}

/**
 * The User's REST calls. Every Layout and Page a spec creates is
 * remembered, and `cleanUp` removes them and puts the original default Layout
 * back, so each spec leaves the shared scratch schema as it found it.
 */
export class UserApi {
  private readonly layouts = new Set<number>()
  private readonly pages = new Set<number>()

  private constructor(
    private readonly request: APIRequestContext,
    /** The default Layout when the spec started, if there was one. */
    readonly originalDefault: Doc | null
  ) {}

  static async open(request: APIRequestContext): Promise<UserApi> {
    const response = await request.get(
      `${ORIGIN}/api/layouts?${query({ "where[isDefault][equals]": "true", depth: 0, limit: 10 })}`
    )
    const { docs } = await json<{ docs: Doc[] }>(
      response,
      "Finding the default Layout"
    )
    return new UserApi(request, docs[0] ?? null)
  }

  // Layouts

  async createLayout(input: LayoutInput): Promise<Doc> {
    const response = await this.request.post(`${ORIGIN}/api/layouts`, {
      data: layoutBody({ header: [], footer: [], ...input }),
    })
    const { doc } = await json<{ doc: Doc }>(
      response,
      `Creating Layout "${input.name}"`
    )
    this.layouts.add(doc.id)
    return doc
  }

  /** Raw create, for checks that expect a refusal. */
  postLayout(input: LayoutInput): Promise<APIResponse> {
    return this.request.post(`${ORIGIN}/api/layouts`, {
      data: layoutBody(input),
    })
  }

  async updateLayout(id: number, input: Partial<LayoutInput>): Promise<Doc> {
    const response = await this.patchLayout(id, input)
    const { doc } = await json<{ doc: Doc }>(response, `Saving Layout ${id}`)
    return doc
  }

  /** Raw update, for checks that may expect a refusal. */
  patchLayout(id: number, input: Partial<LayoutInput>): Promise<APIResponse> {
    return this.request.patch(`${ORIGIN}/api/layouts/${id}`, {
      data: layoutBody(input),
    })
  }

  deleteLayout(id: number): Promise<APIResponse> {
    return this.request.delete(`${ORIGIN}/api/layouts/${id}`)
  }

  /** The Layout, or null when it no longer exists. */
  async getLayout(id: number): Promise<Doc | null> {
    const response = await this.request.get(
      `${ORIGIN}/api/layouts/${id}?depth=0`
    )
    if (response.status() === 404) return null
    return json<Doc>(response, `Reading Layout ${id}`)
  }

  async findLayouts(
    where: Record<string, string | number> = {}
  ): Promise<Doc[]> {
    const response = await this.request.get(
      `${ORIGIN}/api/layouts?${query({ ...where, depth: 0, limit: 200 })}`
    )
    const { docs } = await json<{ docs: Doc[] }>(response, "Listing Layouts")
    return docs
  }

  defaultLayouts(): Promise<Doc[]> {
    return this.findLayouts({ "where[isDefault][equals]": "true" })
  }

  /** The Layout's saved versions, newest first. */
  async layoutVersions(id: number): Promise<Doc[]> {
    const response = await this.request.get(
      `${ORIGIN}/api/layouts/versions?${query({
        "where[parent][equals]": id,
        sort: "-updatedAt",
        depth: 0,
        limit: 200,
      })}`
    )
    const { docs } = await json<{ docs: Doc[] }>(
      response,
      `Layout ${id}'s history`
    )
    return docs
  }

  /** Puts an earlier version of a Layout back. */
  restoreLayoutVersion(versionId: number | string): Promise<APIResponse> {
    return this.request.post(`${ORIGIN}/api/layouts/versions/${versionId}`)
  }

  /** Remembers a Layout made some other way (e.g. Duplicate in the Admin). */
  track(kind: "layout" | "page", id: number) {
    ;(kind === "layout" ? this.layouts : this.pages).add(id)
  }

  // Pages

  /** Creates a Published Page. */
  async createPage(input: PageInput): Promise<Doc> {
    const response = await this.request.post(
      `${ORIGIN}/api/pages?draft=false`,
      {
        data: {
          title: input.title,
          path: input.path,
          _status: "published",
          ...(input.layout ? pageLayoutField(input.layout) : {}),
        },
      }
    )
    const { doc } = await json<{ doc: Doc }>(
      response,
      `Creating Page "${input.title}"`
    )
    this.pages.add(doc.id)
    return doc
  }

  /** Changes a Page and publishes the change. */
  async updatePage(
    id: number,
    input: Partial<Omit<PageInput, "layout">> & { layout?: LayoutChoice }
  ): Promise<Doc> {
    const { layout, ...rest } = input
    const response = await this.request.patch(
      `${ORIGIN}/api/pages/${id}?draft=false`,
      {
        data: {
          ...rest,
          ...(layout ? pageLayoutField(layout) : {}),
          _status: "published",
        },
      }
    )
    const { doc } = await json<{ doc: Doc }>(response, `Publishing Page ${id}`)
    return doc
  }

  deletePage(id: number): Promise<APIResponse> {
    return this.request.delete(`${ORIGIN}/api/pages/${id}`)
  }

  async getPage(id: number): Promise<Doc | null> {
    const response = await this.request.get(`${ORIGIN}/api/pages/${id}?depth=0`)
    if (response.status() === 404) return null
    return json<Doc>(response, `Reading Page ${id}`)
  }

  // Brand

  /** The name the Site shows for itself (the Brand's, or the default). */
  async brandName(): Promise<string> {
    const brand = await this.brand()
    const name = typeof brand.name === "string" ? brand.name.trim() : ""
    return name || "Awayday"
  }

  private async brand(): Promise<Json> {
    const response = await this.request.get(
      `${ORIGIN}/api/globals/brand?depth=0`
    )
    return json<Json>(response, "Reading the Brand")
  }

  /**
   * Removes what the spec made: the original default Layout is made the
   * default again, menus are emptied (so no link blocks a Page's deletion),
   * then the Pages and the Layouts are deleted. Failures are ignored, so one
   * leftover does not hide the spec's own result.
   */
  async cleanUp(): Promise<void> {
    const ignore = async (call: Promise<unknown>) => {
      try {
        await call
      } catch {
        // Best effort.
      }
    }
    if (this.originalDefault) {
      await ignore(
        this.patchLayout(this.originalDefault.id, { isDefault: true })
      )
    }
    for (const id of this.layouts) {
      await ignore(this.patchLayout(id, { header: [], footer: [] }))
    }
    for (const id of this.pages) await ignore(this.deletePage(id))
    for (const id of this.layouts) await ignore(this.deleteLayout(id))
  }
}
