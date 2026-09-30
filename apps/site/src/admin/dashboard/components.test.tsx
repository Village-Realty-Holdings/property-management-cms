// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  ContinueEditingCard,
  QuickActionsCard,
  SeoHealthCard,
  ThemeCard,
  WaitingToPublishCard,
  WAITING_SHOWN,
} from "./cards"
import { CLASSIC } from "../../theme"
import { themeSummaryOf } from "./site"
import { LayoutsTable, usedByLabel } from "./LayoutsTable"
import { PagesSearch, PagesTable } from "./PagesTable"
import type { LayoutRow, PageRow } from "./rows"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

const row = (over: Partial<PageRow> = {}): PageRow => ({
  id: 1,
  title: "About",
  path: "/about",
  status: "published",
  layout: "No Layout",
  updatedAt: "2026-03-01T10:00:00.000Z",
  ...over,
})

describe("<PagesTable>", () => {
  it("shows title, path, status chip, Layout and last updated", () => {
    render(<PagesTable rows={[row({ status: "changes" })]} />)
    const cells = within(screen.getByRole("row", { name: /About/ }))
    expect(
      cells.getByRole("link", { name: "About" }).getAttribute("href")
    ).toBe("/admin/pages/1")
    expect(cells.getByText("/about")).toBeTruthy()
    expect(cells.getByText("Changes not published")).toBeTruthy()
    expect(cells.getByText("No Layout")).toBeTruthy()
    expect(cells.getByText(/Mar 1, 2026/)).toBeTruthy()
  })

  it("offers New Page when there are no Pages", () => {
    render(<PagesTable rows={[]} />)
    expect(
      screen.getByRole("link", { name: /New Page/ }).getAttribute("href")
    ).toBe("/admin/pages/new")
  })

  it("offers Clear search when a search finds nothing", () => {
    render(<PagesTable rows={[]} query="zzz" />)
    expect(screen.getByText("No Pages match your search")).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "Clear search" }).getAttribute("href")
    ).toBe("/admin/pages")
  })
})

describe("<PagesSearch>", () => {
  it("is a labelled GET search form on the server-side query param", () => {
    render(<PagesSearch query="stay" />)
    const form = screen.getByRole("search")
    expect(form.getAttribute("method")).toBe("get")
    const input = screen.getByLabelText("Search Pages by title or path")
    expect(input.getAttribute("name")).toBe("q")
    expect((input as HTMLInputElement).value).toBe("stay")
    expect(screen.getByRole("link", { name: "Clear" })).toBeTruthy()
  })
})

const layout = (over: Partial<LayoutRow> = {}): LayoutRow => ({
  id: 4,
  name: "Listings",
  paths: ["/stays", "/rentals"],
  usedByPages: 3,
  updatedAt: "2026-03-01T10:00:00.000Z",
  ...over,
})

describe("<LayoutsTable>", () => {
  const duplicate = async () => {}

  it("invites you to create your first Layout when there are none", () => {
    render(<LayoutsTable rows={[]} duplicate={duplicate} />)
    expect(screen.getByText("Create your first Layout")).toBeTruthy()
    expect(screen.getByRole("link", { name: /New Layout/ })).toBeTruthy()
  })

  it("shows name, paths, usage, last updated and Duplicate", () => {
    render(<LayoutsTable rows={[layout()]} duplicate={duplicate} />)
    const r = within(screen.getByRole("row", { name: /Listings/ }))
    expect(r.getByText("/stays, /rentals")).toBeTruthy()
    expect(r.getByText("Used by 3 Pages")).toBeTruthy()
    expect(r.getByRole("button", { name: /Duplicate Listings/ })).toBeTruthy()
  })

  it.each([
    [0, "Not used by any Page"],
    [1, "Used by 1 Page"],
    [2, "Used by 2 Pages"],
  ])("%i Pages reads %s", (count, text) => {
    expect(usedByLabel(count)).toBe(text)
  })
})

describe("Dashboard cards", () => {
  it("Continue editing offers New Page when nothing was edited yet", () => {
    render(<ContinueEditingCard items={[]} />)
    expect(screen.getByRole("link", { name: /New Page/ })).toBeTruthy()
  })

  it("Continue editing links each item, Pages and Layouts alike", () => {
    render(
      <ContinueEditingCard
        items={[
          {
            kind: "page",
            id: 1,
            title: "Home",
            href: "/admin/pages/1",
            updatedAt: "2026-03-01T10:00:00.000Z",
          },
          {
            kind: "layout",
            id: 2,
            title: "Listings",
            href: "/admin/layouts/2",
            updatedAt: "2026-03-01T09:00:00.000Z",
          },
        ]}
      />
    )
    expect(
      screen.getByRole("link", { name: /Home/ }).getAttribute("href")
    ).toBe("/admin/pages/1")
    expect(
      screen.getByRole("link", { name: /Listings/ }).getAttribute("href")
    ).toBe("/admin/layouts/2")
  })

  it("Waiting to publish says so when nothing waits", () => {
    render(<WaitingToPublishCard rows={[]} />)
    expect(screen.getByText(/Nothing is waiting/)).toBeTruthy()
  })

  it("Waiting to publish lists a few and counts the rest", () => {
    const rows = Array.from({ length: WAITING_SHOWN + 2 }, (_, i) =>
      row({ id: i + 1, title: `Page ${i + 1}`, status: "changes" })
    )
    render(<WaitingToPublishCard rows={rows} />)
    expect(screen.getAllByRole("listitem")).toHaveLength(WAITING_SHOWN)
    expect(screen.getByText("and 2 more in Pages")).toBeTruthy()
  })

  it("SEO health shows the count and links to SEO", () => {
    render(<SeoHealthCard count={3} />)
    expect(screen.getByText("3")).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "Fix in SEO" }).getAttribute("href")
    ).toBe("/admin/settings/seo")
  })

  it("SEO health is calm at zero", () => {
    render(<SeoHealthCard count={0} />)
    expect(screen.getByText(/Every Published Page has/)).toBeTruthy()
  })

  it("the Theme card shows the default swatches and Edit Theme", () => {
    render(
      <ThemeCard
        summary={themeSummaryOf({
          source: "default",
          inputs: CLASSIC.inputs,
          savedAt: null,
        })}
      />
    )
    expect(screen.getByText("Not customised yet")).toBeTruthy()
    expect(screen.getByText(CLASSIC.inputs.primary)).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "Edit Theme" }).getAttribute("href")
    ).toBe("/admin/theme")
  })

  it("Quick actions: New Page, New Layout, Upload Media", () => {
    render(<QuickActionsCard />)
    expect(
      screen
        .getAllByRole("link")
        .map((a) => [a.textContent?.trim(), a.getAttribute("href")])
    ).toEqual([
      ["New Page", "/admin/pages/new"],
      ["New Layout", "/admin/layouts/new"],
      ["Upload Media", "/admin/media#upload"],
    ])
  })
})
