// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Pagination, pageParam } from "./Pagination"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

const href = (p: number) => `/x?page=${p}`

describe("<Pagination>", () => {
  it("renders nothing for a single page", () => {
    render(<Pagination page={1} totalPages={1} href={href} />)
    expect(screen.queryByRole("navigation")).toBeNull()
  })

  it("links to the previous and next pages", () => {
    render(<Pagination page={2} totalPages={7} href={href} />)
    expect(screen.getByText("Page 2 of 7")).toBeTruthy()
    expect(
      screen.getByRole("link", { name: /Previous/ }).getAttribute("href")
    ).toBe("/x?page=1")
    expect(
      screen.getByRole("link", { name: /Next/ }).getAttribute("href")
    ).toBe("/x?page=3")
  })

  it("disables Previous on the first page", () => {
    render(<Pagination page={1} totalPages={3} href={href} />)
    expect(screen.queryByRole("link", { name: /Previous/ })).toBeNull()
    expect(
      screen
        .getByText("Previous")
        .closest("[aria-disabled]")
        ?.getAttribute("aria-disabled")
    ).toBe("true")
    expect(screen.getByRole("link", { name: /Next/ })).toBeTruthy()
  })

  it("disables Next on the last page", () => {
    render(<Pagination page={3} totalPages={3} href={href} />)
    expect(screen.queryByRole("link", { name: /Next/ })).toBeNull()
    expect(screen.getByRole("link", { name: /Previous/ })).toBeTruthy()
  })
})

describe("pageParam", () => {
  it("reads a whole number of at least 1, else 1", () => {
    expect(pageParam("3")).toBe(3)
    for (const v of [undefined, "abc", "0", "-1", "2.5", ""]) {
      expect(pageParam(v)).toBe(1)
    }
    expect(pageParam(["4", "5"])).toBe(4)
  })
})
