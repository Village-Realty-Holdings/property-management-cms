import { describe, expect, it } from "vitest"

import { focusRingProblems, parseBoxShadow } from "./focusRing"

// What Chromium computes for `ring-3 ring-offset-2` with the ring colour
// #ffffff and the offset colour #283d6b: the gap first, then the ring.
const PANEL = "rgb(40, 61, 107)"
const RING = "rgb(255, 255, 255)"
const gapped = `${PANEL} 0px 0px 0px 2px, ${RING} 0px 0px 0px 5px`

describe("parseBoxShadow", () => {
  it("reads each layer's colour and spread, in order", () => {
    expect(parseBoxShadow(gapped)).toEqual([
      { colour: "#283d6b", alpha: 1, spread: 2, blur: 0 },
      { colour: "#ffffff", alpha: 1, spread: 5, blur: 0 },
    ])
  })

  it("reads alpha, and does not split inside rgba()", () => {
    expect(parseBoxShadow("rgba(40, 61, 107, 0.5) 0px 0px 0px 3px")).toEqual([
      { colour: "#283d6b", alpha: 0.5, spread: 3, blur: 0 },
    ])
  })

  it("reads no layers from none", () => {
    expect(parseBoxShadow("none")).toEqual([])
  })

  it("puts the colour first or last, as the browser may write it", () => {
    expect(parseBoxShadow("0px 0px 0px 3px rgb(255, 255, 255)")).toEqual([
      { colour: "#ffffff", alpha: 1, spread: 3, blur: 0 },
    ])
  })
})

describe("focusRingProblems", () => {
  it("finds none in a ring of the panel's text colour, set off by a gap", () => {
    expect(
      focusRingProblems({ resting: "none", focused: gapped, panel: PANEL })
    ).toEqual([])
  })

  it("finds no change when focus adds nothing", () => {
    expect(
      focusRingProblems({ resting: "none", focused: "none", panel: PANEL })
    ).toEqual([expect.stringContaining("no focus ring")])
  })

  it("finds a ring that is the panel colour at half strength", () => {
    const half = `rgba(40, 61, 107, 0.5) 0px 0px 0px 3px`
    const problems = focusRingProblems({
      resting: "none",
      focused: half,
      panel: PANEL,
    })
    expect(problems.join("\n")).toMatch(/contrast/)
    expect(problems.join("\n")).toMatch(/opaque/)
  })

  it("finds a ring that touches the button with no gap in the panel colour", () => {
    const problems = focusRingProblems({
      resting: "none",
      focused: `${RING} 0px 0px 0px 3px`,
      panel: PANEL,
    })
    expect(problems).toEqual([expect.stringMatching(/gap/)])
  })

  it("ignores the button's resting shadow", () => {
    const rest = "rgba(0, 0, 0, 0.2) 0px 1px 2px 0px"
    expect(
      focusRingProblems({
        resting: rest,
        focused: `${gapped}, ${rest}`,
        panel: PANEL,
      })
    ).toEqual([])
  })
})
