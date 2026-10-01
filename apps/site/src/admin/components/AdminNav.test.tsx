// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const pathname = vi.hoisted(() => ({ current: "/admin" }))
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

import { AdminNav } from "./AdminNav"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

describe("<AdminNav>", () => {
  it("links every Admin screen from one labelled navigation", () => {
    render(<AdminNav />)
    const nav = screen.getByRole("navigation", { name: "Admin" })
    const links = Array.from(nav.querySelectorAll("a")).map((a) => [
      a.textContent,
      a.getAttribute("href"),
    ])
    expect(links).toEqual([
      ["Dashboard", "/admin"],
      ["Layouts", "/admin/layouts"],
      ["Pages", "/admin/pages"],
      ["Media", "/admin/media"],
      ["Brand", "/admin/settings/brand"],
      ["SEO", "/admin/settings/seo"],
      ["Theme", "/admin/theme"],
      ["Assets", "/admin/settings/assets/fonts"],
    ])
  })

  it("names the Content and Settings groups", () => {
    render(<AdminNav />)
    expect(screen.getByRole("group", { name: "Content" })).toBeTruthy()
    expect(screen.getByRole("group", { name: "Settings" })).toBeTruthy()
  })

  it("marks only the current screen with aria-current", () => {
    pathname.current = "/admin/pages/7"
    render(<AdminNav />)
    const current = document.querySelectorAll('[aria-current="page"]')
    expect(current).toHaveLength(1)
    expect(current[0]?.textContent).toBe("Pages")
  })

  it("marks the Dashboard at the Admin root", () => {
    pathname.current = "/admin"
    render(<AdminNav />)
    expect(
      screen
        .getByRole("link", { name: "Dashboard" })
        .getAttribute("aria-current")
    ).toBe("page")
  })
})
