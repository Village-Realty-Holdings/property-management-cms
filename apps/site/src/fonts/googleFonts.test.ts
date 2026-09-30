import { describe, expect, it } from "vitest"

import {
  downloadGoogleFont,
  GoogleFontError,
  type FetchLike,
} from "./googleFonts"

/** The bytes every font file in these fixtures starts with (a WOFF2 header). */
const woff2 = (tag: string) =>
  Buffer.concat([Buffer.from("wOF2"), Buffer.from(tag)])

const GSTATIC = "https://fonts.gstatic.com/s/robotoslab/v34"

/** Google's CSS for one weight/style: a latin-ext and a latin subset. */
function face(weight: number, style: "normal" | "italic", file = "") {
  const name = file || `rs-${weight}-${style}`
  return `/* latin-ext */
@font-face {
  font-family: 'Roboto Slab';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url(${GSTATIC}/${name}-ext.woff2) format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5;
}
/* latin */
@font-face {
  font-family: 'Roboto Slab';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url(${GSTATIC}/${name}.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131;
}
`
}

type Route = Response | (() => Response) | Error

/**
 * A fetch that answers from a table of URLs and records the calls. Anything
 * not in the table is a 404, so a test also sees requests it didn't expect.
 */
function fakeFetch(routes: Record<string, Route>) {
  const calls: { url: string; userAgent: string | null }[] = []
  const fetch: FetchLike = async (input, init) => {
    const url = String(input)
    calls.push({
      url,
      userAgent: new Headers(init?.headers).get("user-agent"),
    })
    const route = routes[url]
    if (route instanceof Error) throw route
    if (!route) return new Response("Not found", { status: 404 })
    return typeof route === "function" ? route() : route.clone()
  }
  return { fetch, calls }
}

const css = (body: string) =>
  new Response(body, { status: 200, headers: { "content-type": "text/css" } })
const file = (tag: string) => new Response(woff2(tag))
const CSS2 = "https://fonts.googleapis.com/css2"

describe("downloadGoogleFont", () => {
  it("asks for the chosen weights and downloads each latin woff2 file", async () => {
    const { fetch, calls } = fakeFetch({
      [`${CSS2}?family=Roboto+Slab:wght@400;700&display=swap`]: css(
        face(400, "normal") + face(700, "normal")
      ),
      [`${GSTATIC}/rs-400-normal.woff2`]: file("400"),
      [`${GSTATIC}/rs-700-normal.woff2`]: file("700"),
    })

    const font = await downloadGoogleFont(
      { family: "Roboto Slab", weights: [700, 400] },
      { fetch }
    )

    expect(font.family).toBe("Roboto Slab")
    expect(
      font.files.map((f) => [f.weight, f.style, f.data.toString()])
    ).toEqual([
      [400, "normal", "wOF2400"],
      [700, "normal", "wOF2700"],
    ])
    // A browser-like User-Agent is what makes Google answer with WOFF2.
    expect(calls[0]!.userAgent).toMatch(/Chrome\/\d+/)
    // Only the latin files were downloaded.
    expect(calls.map((c) => c.url)).toEqual([
      expect.stringContaining("css2?family=Roboto+Slab:wght@400;700"),
      `${GSTATIC}/rs-400-normal.woff2`,
      `${GSTATIC}/rs-700-normal.woff2`,
    ])
  })

  it("puts the italic axis first, in Google's sorted order", async () => {
    const { fetch, calls } = fakeFetch({
      [`${CSS2}?family=Roboto+Slab:ital,wght@0,400;0,700;1,400;1,700&display=swap`]:
        css(
          face(400, "normal") +
            face(700, "normal") +
            face(400, "italic") +
            face(700, "italic")
        ),
      [`${GSTATIC}/rs-400-normal.woff2`]: file("a"),
      [`${GSTATIC}/rs-700-normal.woff2`]: file("b"),
      [`${GSTATIC}/rs-400-italic.woff2`]: file("c"),
      [`${GSTATIC}/rs-700-italic.woff2`]: file("d"),
    })
    const font = await downloadGoogleFont(
      {
        family: "Roboto Slab",
        weights: [400, 700],
        styles: ["italic", "normal"],
      },
      { fetch }
    )
    expect(calls).toHaveLength(5)
    expect(font.files.map((f) => `${f.weight} ${f.style}`)).toEqual([
      "400 normal",
      "400 italic",
      "700 normal",
      "700 italic",
    ])
  })

  it("downloads a variable font's shared file once", async () => {
    const shared = `${GSTATIC}/variable.woff2`
    const variable = (weight: number) =>
      `/* latin */
@font-face {
  font-family: 'Roboto Slab';
  font-style: normal;
  font-weight: ${weight};
  src: url(${shared}) format('woff2');
}
`
    const { fetch, calls } = fakeFetch({
      [`${CSS2}?family=Roboto+Slab:wght@400;700&display=swap`]: css(
        variable(400) + variable(700)
      ),
      [shared]: file("v"),
    })
    const font = await downloadGoogleFont(
      { family: "Roboto Slab", weights: [400, 700] },
      { fetch }
    )
    expect(calls.filter((c) => c.url === shared)).toHaveLength(1)
    expect(font.files.map((f) => f.weight)).toEqual([400, 700])
    expect(font.files[0]!.data).toBe(font.files[1]!.data)
  })

  it("falls back to the first face when a family has no latin subset", async () => {
    const { fetch } = fakeFetch({
      [`${CSS2}?family=Noto+Sans+JP:wght@400&display=swap`]: css(`/* [0] */
@font-face {
  font-family: 'Noto Sans JP';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/notosansjp/v1/first.woff2) format('woff2');
}
/* [1] */
@font-face {
  font-family: 'Noto Sans JP';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/notosansjp/v1/second.woff2) format('woff2');
}
`),
      "https://fonts.gstatic.com/s/notosansjp/v1/first.woff2": file("1"),
    })
    const font = await downloadGoogleFont(
      { family: "Noto Sans JP", weights: [400] },
      { fetch }
    )
    expect(font.files[0]!.data.toString()).toBe("wOF21")
  })

  describe("when Google can't serve it", () => {
    it("reports an unknown family", async () => {
      const { fetch } = fakeFetch({
        [`${CSS2}?family=Nope+Sans:wght@400&display=swap`]: new Response(
          "Family not found",
          { status: 400 }
        ),
        [`${CSS2}?family=Nope+Sans&display=swap`]: new Response("", {
          status: 400,
        }),
      })
      const error = await downloadGoogleFont(
        { family: "Nope Sans", weights: [400] },
        { fetch }
      ).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(GoogleFontError)
      expect(error).toMatchObject({ code: "unknown-family" })
      expect((error as Error).message).toContain("Nope Sans")
    })

    it("names the weights a known family doesn't offer", async () => {
      const { fetch } = fakeFetch({
        [`${CSS2}?family=Roboto+Slab:ital,wght@0,100;0,400;1,100;1,400&display=swap`]:
          new Response("", { status: 400 }),
        [`${CSS2}?family=Roboto+Slab&display=swap`]: css(face(400, "normal")),
        [`${CSS2}?family=Roboto+Slab:wght@100&display=swap`]: new Response("", {
          status: 400,
        }),
        [`${CSS2}?family=Roboto+Slab:wght@400&display=swap`]: css(
          face(400, "normal")
        ),
        [`${CSS2}?family=Roboto+Slab:ital,wght@1,400&display=swap`]:
          new Response("", { status: 400 }),
        [`${CSS2}?family=Roboto+Slab:ital,wght@1,100&display=swap`]:
          new Response("", { status: 400 }),
      })
      const error = await downloadGoogleFont(
        {
          family: "Roboto Slab",
          weights: [100, 400],
          styles: ["normal", "italic"],
        },
        { fetch }
      ).catch((e: unknown) => e)
      expect(error).toMatchObject({ code: "weight-unavailable" })
      expect((error as Error).message).toContain("Roboto Slab")
      expect((error as Error).message).toContain("100")
      expect((error as Error).message).toContain("italic 100")
      expect((error as Error).message).toContain("italic 400")
    })

    it("reports a network failure, and downloads nothing more", async () => {
      const { fetch, calls } = fakeFetch({
        [`${CSS2}?family=Roboto+Slab:wght@400&display=swap`]: new TypeError(
          "fetch failed"
        ),
      })
      await expect(
        downloadGoogleFont({ family: "Roboto Slab", weights: [400] }, { fetch })
      ).rejects.toMatchObject({ code: "network" })
      expect(calls).toHaveLength(1)
    })

    it("reports Google being down as a network failure, not an unknown family", async () => {
      const { fetch } = fakeFetch({
        [`${CSS2}?family=Roboto+Slab:wght@400&display=swap`]: new Response("", {
          status: 503,
        }),
      })
      await expect(
        downloadGoogleFont({ family: "Roboto Slab", weights: [400] }, { fetch })
      ).rejects.toMatchObject({ code: "network" })
    })

    it("fails the whole download when one file fails", async () => {
      const { fetch } = fakeFetch({
        [`${CSS2}?family=Roboto+Slab:wght@400;700&display=swap`]: css(
          face(400, "normal") + face(700, "normal")
        ),
        [`${GSTATIC}/rs-400-normal.woff2`]: file("400"),
        [`${GSTATIC}/rs-700-normal.woff2`]: new Response("", { status: 500 }),
      })
      await expect(
        downloadGoogleFont(
          { family: "Roboto Slab", weights: [400, 700] },
          { fetch }
        )
      ).rejects.toMatchObject({ code: "network" })
    })
  })

  describe("what it refuses to download", () => {
    const withFile = (url: string, body: BodyInit) =>
      fakeFetch({
        [`${CSS2}?family=Roboto+Slab:wght@400&display=swap`]: css(
          `/* latin */
@font-face {
  font-family: 'Roboto Slab';
  font-style: normal;
  font-weight: 400;
  src: url(${url}) format('woff2');
}
`
        ),
        [url]: new Response(body),
      })

    it("takes files only from fonts.gstatic.com", async () => {
      const { fetch, calls } = withFile(
        "https://evil.example.test/a.woff2",
        woff2("x")
      )
      await expect(
        downloadGoogleFont({ family: "Roboto Slab", weights: [400] }, { fetch })
      ).rejects.toMatchObject({ code: "bad-response" })
      expect(calls).toHaveLength(1)
    })

    it("rejects a file that isn't WOFF2", async () => {
      const { fetch } = withFile(`${GSTATIC}/a.woff2`, "<html>oops</html>")
      await expect(
        downloadGoogleFont({ family: "Roboto Slab", weights: [400] }, { fetch })
      ).rejects.toMatchObject({ code: "bad-response" })
    })

    it("rejects a file over the size limit", async () => {
      const { fetch } = withFile(`${GSTATIC}/a.woff2`, woff2("x".repeat(100)))
      await expect(
        downloadGoogleFont(
          { family: "Roboto Slab", weights: [400] },
          { fetch, maxFileBytes: 50 }
        )
      ).rejects.toMatchObject({ code: "bad-response" })
    })
  })

  describe("input", () => {
    const rejects = async (input: Parameters<typeof downloadGoogleFont>[0]) => {
      const { fetch, calls } = fakeFetch({})
      await expect(downloadGoogleFont(input, { fetch })).rejects.toMatchObject({
        code: "invalid-input",
      })
      // Nothing is sent for input that is refused.
      expect(calls).toHaveLength(0)
    }

    it.each([
      "",
      "   ",
      "Roboto&display=block",
      "Roboto:wght@900",
      "a/../b",
      "https://evil.example.test/x",
      "Roboto\nSlab",
      "Roboto%20Slab",
      "Roboto;Slab",
      "x".repeat(61),
    ])("refuses the family %j", (family) => rejects({ family, weights: [400] }))

    it("refuses no weights, and weights Google doesn't have", async () => {
      await rejects({ family: "Roboto", weights: [] })
      await rejects({ family: "Roboto", weights: [450] })
      await rejects({ family: "Roboto", weights: [1000] })
      await rejects({ family: "Roboto", weights: [400.5] })
    })

    it("refuses an unknown style", async () => {
      await rejects({
        family: "Roboto",
        weights: [400],
        styles: ["oblique" as never],
      })
    })

    it("accepts the names Google families really use", async () => {
      for (const family of [
        "Roboto Slab",
        "IBM Plex Sans",
        "M PLUS 1p",
        "Rubik 80s Fade",
      ]) {
        const { fetch } = fakeFetch({})
        // Reaches Google (which answers 404 in this fake) instead of refusing.
        await expect(
          downloadGoogleFont({ family, weights: [400] }, { fetch })
        ).rejects.toMatchObject({ code: "unknown-family" })
      }
    })
  })
})
