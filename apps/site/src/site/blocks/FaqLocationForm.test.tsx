// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axe from "axe-core"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { BlockOf } from "./types"
import { Block } from "."
import { validateForm, type FormFieldName } from "./formValidation"
import { faqSample } from "./samples/faq"
import { formSample } from "./samples/form"
import { locationSample } from "./samples/location"
import { faqPageJsonLd, jsonLdScript } from "./structuredData"

const LS = String.fromCharCode(0x2028)
const PS = String.fromCharCode(0x2029)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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

type FaqLd = {
  mainEntity: { name: string; acceptedAnswer: { text: string } }[]
}

/** The JSON-LD scripts in `container`, parsed. */
function jsonLd(container: HTMLElement): unknown[] {
  return [
    ...container.querySelectorAll('script[type="application/ld+json"]'),
  ].map((script) => JSON.parse(script.textContent ?? "null"))
}

const faq = (overrides: Partial<BlockOf<"faq">> = {}): BlockOf<"faq"> => ({
  ...faqSample,
  ...overrides,
})
const location = (
  overrides: Partial<BlockOf<"location">> = {}
): BlockOf<"location"> => ({ ...locationSample, ...overrides })
const form = (overrides: Partial<BlockOf<"form">> = {}): BlockOf<"form"> => ({
  ...formSample,
  ...overrides,
})

describe("faqPageJsonLd", () => {
  it("is a FAQPage whose Questions carry their accepted Answer", () => {
    expect(
      faqPageJsonLd([
        { question: "Pets?", answer: "Some homes." },
        { question: "Fees?", answer: "One cleaning fee." },
      ])
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Pets?",
          acceptedAnswer: { "@type": "Answer", text: "Some homes." },
        },
        {
          "@type": "Question",
          name: "Fees?",
          acceptedAnswer: { "@type": "Answer", text: "One cleaning fee." },
        },
      ],
    })
  })

  it("leaves out a question or answer that is blank, and is null when nothing is left", () => {
    expect(
      faqPageJsonLd([
        { question: "  ", answer: "No question" },
        { question: "No answer", answer: "" },
      ])
    ).toBeNull()
  })
})

describe("jsonLdScript", () => {
  it("cannot close its own script, open a comment or break a line", () => {
    const text = jsonLdScript({
      a: "</script><script>alert(1)</script><!--",
      b: `line${LS}break${PS}`,
    })
    expect(text).not.toMatch(/<\/script/i)
    expect(text).not.toContain("<")
    expect(text).not.toContain(LS)
    expect(text).not.toContain(PS)
    expect(JSON.parse(text)).toEqual({
      a: "</script><script>alert(1)</script><!--",
      b: `line${LS}break${PS}`,
    })
  })
})

describe("FAQ", () => {
  it("emits FAQPage JSON-LD that matches the items", () => {
    const { container } = render(<Block block={faq()} index={1} />)
    const [data] = jsonLd(container)
    expect(data).toEqual(faqPageJsonLd(faqSample.questions))
    const entities = (data as FaqLd).mainEntity
    expect(entities.map((e) => e.name)).toEqual(
      faqSample.questions.map((q) => q.question)
    )
    expect(entities.map((e) => e.acceptedAnswer.text)).toEqual(
      faqSample.questions.map((q) => q.answer)
    )
  })

  it("escapes </script> in a question or answer, so the page cannot be broken out of", () => {
    const hostile = "</script><img src=x onerror=alert(1)>"
    const { container } = render(
      <Block
        block={faq({
          questions: [
            { question: `Q ${hostile}`, answer: `A ${hostile}` },
            { question: "Plain?", answer: "Plain." },
          ],
        })}
        index={1}
      />
    )
    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]'
    )
    expect(scripts).toHaveLength(1)
    expect(scripts[0]!.textContent).not.toContain("<")
    const [data] = jsonLd(container) as [FaqLd]
    expect(data.mainEntity[0]!.name).toBe(`Q ${hostile}`)
    expect(data.mainEntity[0]!.acceptedAnswer.text).toBe(`A ${hostile}`)
    // Nothing escaped the script: no injected image.
    expect(container.querySelector("img")).toBeNull()
  })

  it("shows each question as an accordion button, closed to begin with", () => {
    render(<Block block={faq()} index={1} />)
    const region = screen.getByRole("region", { name: faqSample.heading })
    const buttons = within(region).getAllByRole("button")
    expect(buttons.map((b) => b.textContent)).toEqual(
      faqSample.questions.map((q) => q.question)
    )
    for (const button of buttons) {
      expect(button.getAttribute("aria-expanded")).toBe("false")
    }
  })

  it("opens and closes by keyboard: Enter and Space, and Tab moves between questions", async () => {
    const user = userEvent.setup()
    render(<Block block={faq()} index={1} />)
    const [first, second] = screen.getAllByRole("button")
    await user.tab()
    expect(document.activeElement).toBe(first)
    await user.keyboard("{Enter}")
    expect(first!.getAttribute("aria-expanded")).toBe("true")
    await user.keyboard(" ")
    expect(first!.getAttribute("aria-expanded")).toBe("false")
    await user.tab()
    expect(document.activeElement).toBe(second)
    await user.keyboard("{Enter}")
    expect(second!.getAttribute("aria-expanded")).toBe("true")
    const panel = document.getElementById(
      second!.getAttribute("aria-controls")!
    )
    expect(panel?.textContent).toContain(faqSample.questions[1]!.answer)
  })

  it("renders nothing without a heading, and no JSON-LD without a question", () => {
    expect(
      render(<Block block={faq({ heading: " " })} index={1} />).container
        .innerHTML
    ).toBe("")
    cleanup()
    const { container } = render(
      <Block block={faq({ questions: [] })} index={1} />
    )
    expect(container.querySelector("script")).toBeNull()
  })

  it("passes axe", async () => {
    const { container } = render(<Block block={faq()} index={1} />)
    expect(await violations(container)).toEqual([])
  })
})

describe("Location", () => {
  it("shows the heading, the address in an <address>, and the text", () => {
    const { container } = render(<Block block={location()} index={1} />)
    const address = container.querySelector("address")!
    expect(address.textContent).toContain("12 Harbour Road")
    expect(address.textContent).toContain("Seaside Bay")
    expect(container.textContent).toContain(locationSample.text)
    expect(
      screen.getByRole("heading", { name: locationSample.heading })
    ).toBeTruthy()
  })

  it("a map card links to directions and loads nothing from another site", () => {
    const { container } = render(
      <Block block={location({ map: "card" })} index={1} />
    )
    expect(container.querySelector("iframe, embed, object")).toBeNull()
    expect(container.querySelector("img")).toBeNull()
    const link = screen.getByRole("link", { name: /directions/i })
    const href = new URL(link.getAttribute("href")!)
    expect(href.protocol).toBe("https:")
    expect(href.searchParams.get("destination")).toContain("12 Harbour Road")
    expect(link.getAttribute("rel")).toContain("noopener")
  })

  it("a map image shows the picture with its alt text", () => {
    const { container } = render(
      <Block block={location({ map: "image" })} index={1} />
    )
    const img = container.querySelector("img")!
    expect(img.getAttribute("alt")).toBe("A map of Seaside Bay and the harbour")
    expect(img.getAttribute("src")).toContain("map.svg")
    expect(container.querySelector("iframe")).toBeNull()
  })

  it("a map image with no picture falls back to the map card", () => {
    const { container } = render(
      <Block block={location({ map: "image", mapImage: null })} index={1} />
    )
    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByRole("link", { name: /directions/i })).toBeTruthy()
  })

  it.each(["card", "image"] as const)("passes axe (%s map)", async (map) => {
    const { container } = render(<Block block={location({ map })} index={1} />)
    expect(await violations(container)).toEqual([])
  })
})

describe("validateForm", () => {
  const fields: FormFieldName[] = [
    "name",
    "email",
    "phone",
    "message",
    "propertyAddress",
    "dates",
  ]
  const valid = {
    name: "Ada",
    email: "ada@example.com",
    phone: "+1 555 0100",
    message: "Hello",
    propertyAddress: "1 Sea Rd",
    checkIn: "2026-10-10",
    checkOut: "2026-10-10",
  }

  it("has no errors for good values", () => {
    expect(validateForm(fields, valid)).toEqual({})
  })

  it("needs a name, a well-formed email and a message; the rest are optional", () => {
    expect(
      validateForm(fields, {
        name: " ",
        email: "nope",
        message: "",
        phone: "",
        propertyAddress: "",
        checkIn: "",
        checkOut: "",
      })
    ).toEqual({
      name: expect.any(String),
      email: expect.any(String),
      message: expect.any(String),
    })
    expect(validateForm(fields, { ...valid, email: "" }).email).toMatch(
      /email/i
    )
  })

  it("only checks the fields the Form shows", () => {
    expect(validateForm(["name"], { name: "Ada", email: "bad" })).toEqual({})
  })

  it("rejects a phone number with too few digits, and a check-out before check-in", () => {
    expect(validateForm(["phone"], { phone: "12" }).phone).toBeTruthy()
    expect(
      validateForm(["dates"], { checkIn: "2026-10-10", checkOut: "2026-10-09" })
        .checkOut
    ).toBeTruthy()
  })
})

describe("Form", () => {
  const submit = () =>
    screen.getByRole("button", { name: formSample.submitLabel })

  it("shows the fields it was given in order, each labelled and with an autocomplete hint", () => {
    render(
      <Block
        block={form({ formFields: ["email", "name", "phone"] })}
        index={1}
      />
    )
    const inputs = screen.getAllByRole("textbox")
    expect(inputs.map((i) => i.getAttribute("autocomplete"))).toEqual([
      "email",
      "name",
      "tel",
    ])
    expect(screen.getByLabelText(/email/i)).toBe(inputs[0])
    expect(screen.getByLabelText(/name/i)).toBe(inputs[1])
    expect(screen.getByLabelText(/phone/i)).toBe(inputs[2])
    expect(screen.queryByLabelText(/message/i)).toBeNull()
  })

  it("offers every field the spec lists", () => {
    render(<Block block={form()} index={1} />)
    for (const label of [
      /name/i,
      /email/i,
      /phone/i,
      /message/i,
      /property address/i,
      /check-in/i,
      /check-out/i,
    ]) {
      expect(screen.getByLabelText(label), String(label)).toBeTruthy()
    }
  })

  it("shows inline errors for bad values, focuses the first, and shows no success", async () => {
    const user = userEvent.setup()
    const { container } = render(<Block block={form()} index={1} />)
    await user.type(screen.getByLabelText(/email/i), "nope")
    await user.click(submit())
    const name = screen.getByLabelText(/name/i)
    expect(name.getAttribute("aria-invalid")).toBe("true")
    const described = name.getAttribute("aria-describedby")!
    expect(document.getElementById(described)?.textContent).toMatch(/name/i)
    expect(screen.getByLabelText(/email/i).getAttribute("aria-invalid")).toBe(
      "true"
    )
    expect(document.activeElement).toBe(name)
    expect(screen.getByRole("status").textContent).toBe("")
    expect(container.textContent).not.toContain(formSample.successMessage)
    expect(await violations(container)).toEqual([])
  })

  it("sends once the values are fixed", async () => {
    const user = userEvent.setup()
    render(<Block block={form({ formFields: ["name"] })} index={1} />)
    await user.click(submit())
    expect(screen.getByLabelText(/name/i).getAttribute("aria-invalid")).toBe(
      "true"
    )
    await user.type(screen.getByLabelText(/name/i), "Ada")
    await user.click(submit())
    expect(screen.getByRole("status").textContent).toBe(
      formSample.successMessage
    )
  })

  it("on submit shows the success message in a live region and makes no request", async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const open = vi.spyOn(XMLHttpRequest.prototype, "open")
    const beacon = vi.fn()
    Object.defineProperty(navigator, "sendBeacon", {
      value: beacon,
      configurable: true,
    })
    const { container } = render(<Block block={form()} index={1} />)
    const status = screen.getByRole("status")
    expect(status.getAttribute("aria-live")).toBe("polite")
    expect(status.textContent).toBe("")

    await user.type(screen.getByLabelText(/name/i), "Ada Lovelace")
    await user.type(screen.getByLabelText(/email/i), "ada@example.com")
    await user.type(screen.getByLabelText(/phone/i), "+1 555 0100")
    await user.type(screen.getByLabelText(/message/i), "Hello there")
    await user.type(screen.getByLabelText(/property address/i), "1 Sea Rd")
    await user.type(screen.getByLabelText(/check-in/i), "2026-10-10")
    await user.type(screen.getByLabelText(/check-out/i), "2026-10-12")
    await user.click(submit())

    expect(screen.getByRole("status")).toBe(status)
    expect(status.textContent).toBe(formSample.successMessage)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
    expect(beacon).not.toHaveBeenCalled()
    expect(await violations(container)).toEqual([])
  })

  it("the form has no action to post to and leaves validation to the Block", () => {
    const { container } = render(<Block block={form()} index={1} />)
    const element = container.querySelector("form")!
    expect(element.getAttribute("action")).toBeNull()
    expect(element.noValidate).toBe(true)
  })

  it("passes axe", async () => {
    const { container } = render(<Block block={form()} index={1} />)
    expect(await violations(container)).toEqual([])
  })
})
