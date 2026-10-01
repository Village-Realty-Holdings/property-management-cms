// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axe from "axe-core"
import { afterEach, describe, expect, it, vi } from "vitest"

import { backgrounds } from "../../fields/background"
import type { Brand } from "../brand"
import { fixturesFor } from "../fixtures"
import { RegionBlocks } from "../regions"
import { Block } from "."
import { emailProblem } from "./NewsletterForm"
import { samples } from "./samples"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** WCAG 2.2 AA violations in `element` (colour contrast is for the browser tests, jsdom has no layout). */
async function violations(element: HTMLElement) {
  const results = await axe.run(element, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
    rules: { "color-contrast": { enabled: false } },
  })
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.html),
  }))
}

describe("Steps", () => {
  const steps = samples.steps

  it("renders from its sample: a named section, an ordered list of numbered steps, each with a title and text", async () => {
    const { container } = render(<Block block={steps} index={1} />)
    const section = container.querySelector("section")!
    const heading = within(section).getByRole("heading", { level: 2 })
    expect(heading.textContent).toBe(steps.heading)
    expect(section.getAttribute("aria-labelledby")).toBe(heading.id)
    expect(section.textContent).toContain(steps.intro)

    const list = section.querySelector("ol")!
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(steps.steps.length)
    items.forEach((item, i) => {
      const step = steps.steps[i]!
      expect(within(item).getByRole("heading", { level: 3 }).textContent).toBe(
        step.title
      )
      expect(item.textContent).toContain(step.text)
      expect(item.textContent).toContain(String(i + 1))
    })
    expect(await violations(container)).toEqual([])
  })

  it("leaves out a step with no title, and the whole Block with no heading", () => {
    const partial = {
      ...steps,
      steps: [...steps.steps.slice(0, 2), { title: "  ", text: "Orphan text" }],
    }
    const { container, rerender } = render(<Block block={partial} index={1} />)
    expect(container.querySelectorAll("ol > li")).toHaveLength(2)
    rerender(<Block block={{ ...steps, heading: " " }} index={1} />)
    expect(container.innerHTML).toBe("")
  })

  it("has no intro paragraph when there is none", () => {
    const { container } = render(
      <Block block={{ ...steps, intro: undefined }} index={1} />
    )
    expect(container.textContent).not.toContain("From first call")
  })
})

describe("Stats", () => {
  const stats = samples.stats

  it("renders from its sample: each figure with its label", async () => {
    const { container } = render(<Block block={stats} index={1} />)
    const section = container.querySelector("section")!
    expect(within(section).getByRole("heading", { level: 2 }).textContent).toBe(
      stats.heading
    )
    const items = within(section).getAllByRole("listitem")
    expect(items).toHaveLength(stats.stats.length)
    items.forEach((item, i) => {
      expect(item.textContent).toContain(stats.stats[i]!.value)
      expect(item.textContent).toContain(stats.stats[i]!.label)
    })
    expect(await violations(container)).toEqual([])
  })

  it("leaves out a figure missing its value or its label", () => {
    const partial = {
      ...stats,
      stats: [
        ...stats.stats.slice(0, 3),
        { value: "", label: "No figure" },
        { value: "9", label: " " },
      ],
    }
    const { container } = render(<Block block={partial} index={1} />)
    expect(container.querySelectorAll("li")).toHaveLength(3)
  })
})

describe("Owner band", () => {
  const band = samples.ownerBand

  it("renders from its sample: pitch, benefits and a call to action link", async () => {
    const { container } = render(<Block block={band} index={1} />)
    const section = container.querySelector("section")!
    expect(within(section).getByRole("heading", { level: 2 }).textContent).toBe(
      band.heading
    )
    expect(section.textContent).toContain(band.pitch)
    const benefits = within(section).getAllByRole("listitem")
    expect(benefits.map((li) => li.textContent)).toEqual(
      band.benefits.map((b) => b.text)
    )
    const cta = within(section).getByRole("link", { name: band.cta!.label! })
    expect(cta.getAttribute("href")).toBe("/owners")
    expect(await violations(container)).toEqual([])
  })

  it("has no button when the link is blank or unsafe", () => {
    const { container, rerender } = render(
      <Block block={{ ...band, cta: { label: "Go", href: "" } }} index={1} />
    )
    expect(container.querySelector("a")).toBeNull()
    rerender(
      <Block
        block={{ ...band, cta: { label: "Go", href: "javascript:alert(1)" } }}
        index={1}
      />
    )
    expect(container.querySelector("a")).toBeNull()
  })

  it("is drawn on the dark surface when the Block says so", () => {
    const { container } = render(<Block block={band} index={1} />)
    // The sample's own background is "dark", which BlockSection paints.
    expect(container.querySelector("section")!.className).toContain(
      "bg-surface-dark"
    )
  })
})

describe("emailProblem", () => {
  it("names what is wrong with an empty or malformed address", () => {
    expect(emailProblem("")).toMatch(/enter your email/i)
    expect(emailProblem("   ")).toMatch(/enter your email/i)
    expect(emailProblem("guest")).toMatch(/valid email/i)
    expect(emailProblem("guest@")).toMatch(/valid email/i)
    expect(emailProblem("guest@example")).toMatch(/valid email/i)
    expect(emailProblem("a b@example.com")).toMatch(/valid email/i)
  })

  it("accepts an address, ignoring surrounding space", () => {
    expect(emailProblem("guest@example.com")).toBeNull()
    expect(emailProblem("  guest+stay@mail.example.co.uk ")).toBeNull()
  })
})

describe("Newsletter", () => {
  const newsletter = samples.newsletter

  it("renders from its sample: heading, text and a labelled email field", async () => {
    const { container } = render(<Block block={newsletter} index={1} />)
    const section = container.querySelector("section")!
    expect(within(section).getByRole("heading", { level: 2 }).textContent).toBe(
      newsletter.heading
    )
    expect(section.textContent).toContain(newsletter.text)
    const input = within(section).getByLabelText(/email/i)
    expect(input.getAttribute("type")).toBe("email")
    expect(input.getAttribute("autocomplete")).toBe("email")
    expect(input.getAttribute("placeholder")).toBe(newsletter.emailPlaceholder)
    expect(
      within(section).getByRole("button", { name: newsletter.buttonLabel })
    ).toBeTruthy()
    expect(await violations(container)).toEqual([])
  })

  it("shows a message and stores nothing for an address that is not valid", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
    const user = userEvent.setup()
    const { container } = render(<Block block={newsletter} index={1} />)
    const input = screen.getByLabelText(/email/i)

    await user.click(screen.getByRole("button", { name: "Subscribe" }))
    const problem = await screen.findByRole("alert")
    expect(problem.textContent).toMatch(/enter your email/i)
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(input.getAttribute("aria-describedby")).toContain(problem.id)
    expect(screen.queryByRole("status")?.textContent ?? "").toBe("")
    expect(await violations(container)).toEqual([])

    await user.type(input, "guest@")
    await user.click(screen.getByRole("button", { name: "Subscribe" }))
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /valid email/i
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows a success message for a valid address, clears the field and sends nothing", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
    const beacon = vi.fn()
    Object.defineProperty(navigator, "sendBeacon", {
      value: beacon,
      configurable: true,
    })
    const user = userEvent.setup()
    const { container } = render(<Block block={newsletter} index={1} />)
    const input = screen.getByLabelText(/email/i) as HTMLInputElement

    await user.type(input, "guest@example.com")
    await user.click(screen.getByRole("button", { name: "Subscribe" }))

    const status = await screen.findByRole("status")
    expect(status.textContent).toMatch(/thank/i)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(input.value).toBe("")
    expect(input.getAttribute("aria-invalid")).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(beacon).not.toHaveBeenCalled()
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
    expect(document.cookie).toBe("")
    expect(container.querySelector("form")!.getAttribute("action")).toBeNull()
    expect(await violations(container)).toEqual([])
  })

  it("clears a message once the address is edited", async () => {
    const user = userEvent.setup()
    render(<Block block={newsletter} index={1} />)
    await user.click(screen.getByRole("button", { name: "Subscribe" }))
    await screen.findByRole("alert")
    await user.type(screen.getByLabelText(/email/i), "g")
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("falls back to a default placeholder, and leaves out text that is blank", () => {
    const { container } = render(
      <Block
        block={{ ...newsletter, emailPlaceholder: null, text: " " }}
        index={1}
      />
    )
    expect(screen.getByLabelText(/email/i).getAttribute("placeholder")).toBe(
      "Your email address"
    )
    expect(container.textContent).not.toContain(newsletter.text)
    expect(container.querySelectorAll("section p:not([role])")).toHaveLength(0)
  })

  it("renders in a Footer, through the page Block registry", async () => {
    const brand: Brand = {
      name: "Sea Stays",
      tagline: null,
      logo: null,
      phone: null,
      email: null,
      address: null,
      social: [],
    }
    const { container } = render(
      <RegionBlocks
        region="footer"
        blocks={[newsletter]}
        context={{ brand, fixtures: fixturesFor(undefined), editing: false }}
      />
    )
    const footer = container.querySelector("footer")!
    expect(
      within(footer).getByRole("heading", { name: newsletter.heading })
    ).toBeTruthy()
    expect(within(footer).getByLabelText(/email/i)).toBeTruthy()
    expect(await violations(container)).toEqual([])
  })
})

describe("every background", () => {
  const cases = (
    ["steps", "stats", "ownerBand", "newsletter"] as const
  ).flatMap((type) =>
    backgrounds.map((background) => [type, background] as const)
  )

  it.each(cases)("%s on %s passes axe", async (type, background) => {
    const block = { ...samples[type], background }
    const { container } = render(<Block block={block} index={1} />)
    expect(container.querySelector("section")!.className).toMatch(/bg-/)
    expect(await violations(container)).toEqual([])
  })
})
