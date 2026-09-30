import { describe, expect, it } from "vitest"

import { foreignRequests } from "./network"

const origin = "http://localhost:3101"

describe("foreignRequests", () => {
  it("is empty when every request stays on the Site's origin", () => {
    expect(
      foreignRequests(
        [
          `${origin}/`,
          `${origin}/_next/static/media/newsreader.woff2`,
          `${origin}/api/fonts/file/montserrat-700.woff2`,
        ],
        origin
      )
    ).toEqual([])
  })

  it("lists a request to Google Fonts", () => {
    expect(
      foreignRequests(
        [
          `${origin}/`,
          "https://fonts.googleapis.com/css2?family=Lora",
          "https://fonts.gstatic.com/s/lora/v1/x.woff2",
        ],
        origin
      )
    ).toEqual([
      "https://fonts.googleapis.com/css2?family=Lora",
      "https://fonts.gstatic.com/s/lora/v1/x.woff2",
    ])
  })

  it("lists a same-host request on another port", () => {
    expect(foreignRequests(["http://localhost:3000/x"], origin)).toEqual([
      "http://localhost:3000/x",
    ])
  })

  it("ignores data and blob URLs, which never leave the browser", () => {
    expect(
      foreignRequests(
        ["data:font/woff2;base64,AAAA", "blob:http://x/1"],
        origin
      )
    ).toEqual([])
  })

  it("lists a URL it cannot parse rather than trusting it", () => {
    expect(foreignRequests(["not a url"], origin)).toEqual(["not a url"])
  })
})
