import { describe, expect, it } from "vitest"

import { derivePageStatus, pageStatusLabel } from "./pageStatus"

describe("derivePageStatus", () => {
  it("is Draft for a Page that was never published", () => {
    expect(derivePageStatus({ published: "draft", latest: "draft" })).toBe(
      "draft"
    )
  })

  it("is Published when the newest version is the published one", () => {
    expect(
      derivePageStatus({ published: "published", latest: "published" })
    ).toBe("published")
  })

  it("is Changes not published when a Published Page has a newer Draft", () => {
    expect(derivePageStatus({ published: "published", latest: "draft" })).toBe(
      "changes"
    )
  })

  it("treats missing statuses as Draft", () => {
    expect(derivePageStatus({ published: null, latest: undefined })).toBe(
      "draft"
    )
  })
})

describe("pageStatusLabel", () => {
  it.each([
    ["draft", "Draft"],
    ["published", "Published"],
    ["changes", "Changes not published"],
  ] as const)("%s reads %s", (status, label) => {
    expect(pageStatusLabel(status)).toBe(label)
  })
})
