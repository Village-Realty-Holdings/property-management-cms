// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axe from "axe-core"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { combineFonts, type AvailableFont } from "../../../fonts/available"
import {
  AVADA,
  contrastWarnings,
  DEFAULT_INPUTS,
  INPUT_LABELS,
  presetInputs,
  TERRACOTTA,
  type ThemeInputs,
} from "../../../theme"
import { ThemeControls } from "./ThemeControls"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

const builtIns = combineFonts([])
const fonts: AvailableFont[] = combineFonts([
  {
    id: 7,
    family: "Montserrat",
    kind: "sans",
    files: [{ weight: 400, style: "normal", url: "/m.woff2" }],
  },
])

function setup(value: ThemeInputs = DEFAULT_INPUTS, available = fonts) {
  const onChange = vi.fn()
  const user = userEvent.setup()
  const view = render(
    <ThemeControls value={value} onChange={onChange} fonts={available} />
  )
  return { onChange, user, ...view }
}

/** The controls as a Staff User edits them: each change feeds the next render. */
function Harness({ initial }: { initial: ThemeInputs }) {
  const [value, setValue] = useState(initial)
  return <ThemeControls value={value} onChange={setValue} fonts={fonts} />
}

const lastCall = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls.at(-1)![0] as ThemeInputs

describe("<ThemeControls>", () => {
  it("shows the nine control groups", () => {
    setup()
    for (const name of [
      "Presets",
      "Colours",
      "Fonts",
      "Type",
      "Corners",
      "Spacing",
      "Shadows",
      "Buttons",
      "Motion",
    ])
      expect(screen.getByRole("heading", { name }), name).toBeTruthy()
  })

  it("applies every input of a preset, with its fonts from the Site", async () => {
    const { onChange, user } = setup()
    await user.click(screen.getByRole("button", { name: "Terracotta" }))
    expect(onChange).toHaveBeenCalledWith(presetInputs(TERRACOTTA, fonts))

    await user.click(screen.getByRole("button", { name: "Avada" }))
    const applied = lastCall(onChange)
    expect(applied).toEqual(presetInputs(AVADA, fonts))
    // Avada names Montserrat, which the Site has stored.
    expect(applied.headingFont).toBe("font:7")
  })

  it("marks the preset whose inputs are in use", () => {
    setup(presetInputs(TERRACOTTA, fonts))
    expect(
      screen
        .getByRole("button", { name: "Terracotta" })
        .getAttribute("aria-pressed")
    ).toBe("true")
    expect(
      screen
        .getByRole("button", { name: "Harbour" })
        .getAttribute("aria-pressed")
    ).toBe("false")
  })

  it.each(["primary", "accent", "text"] as const)(
    "sets the %s colour from its hex text",
    async (key) => {
      const { onChange, user } = setup()
      const field = screen.getByRole("textbox", { name: INPUT_LABELS[key] })
      await user.clear(field)
      await user.type(field, "#AB12cd")
      expect(lastCall(onChange)).toEqual({
        ...DEFAULT_INPUTS,
        [key]: "#ab12cd",
      })
    }
  )

  it("accepts a three-digit hex, and ignores one that is not finished", async () => {
    const { onChange, user } = setup()
    const field = screen.getByRole("textbox", { name: "Primary colour" })
    await user.clear(field)
    await user.type(field, "#ab")
    expect(onChange).not.toHaveBeenCalled()
    await user.type(field, "c")
    expect(lastCall(onChange).primary).toBe("#aabbcc")
  })

  it("puts an unfinished hex back when the field loses focus", async () => {
    const { user } = setup()
    const field = screen.getByRole<HTMLInputElement>("textbox", {
      name: "Primary colour",
    })
    await user.clear(field)
    await user.type(field, "#zz")
    await user.tab()
    expect(field.value).toBe(DEFAULT_INPUTS.primary)
  })

  it("follows the value when it changes from outside", () => {
    const { rerender, onChange } = setup()
    rerender(
      <ThemeControls
        value={{ ...DEFAULT_INPUTS, primary: "#123456" }}
        onChange={onChange}
        fonts={fonts}
      />
    )
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Primary colour" })
        .value
    ).toBe("#123456")
  })

  it("shows each colour as a swatch that opens the picker", () => {
    const { onChange } = setup()
    const picker = screen.getByLabelText<HTMLInputElement>(
      "Primary colour picker"
    )
    expect(picker.type).toBe("color")
    expect(picker.value).toBe(DEFAULT_INPUTS.primary)
    fireEvent.change(picker, { target: { value: "#00ff00" } })
    expect(lastCall(onChange).primary).toBe("#00ff00")
  })

  it("adds and removes the optional third colour", async () => {
    const { onChange, user, rerender } = setup()
    expect(screen.queryByRole("textbox", { name: "Third colour" })).toBeNull()
    await user.click(screen.getByRole("button", { name: "Add a third colour" }))
    const added = lastCall(onChange).third
    expect(added).toMatch(/^#[0-9a-f]{6}$/)

    rerender(
      <ThemeControls
        value={{ ...DEFAULT_INPUTS, third: added }}
        onChange={onChange}
        fonts={fonts}
      />
    )
    expect(screen.getByRole("textbox", { name: "Third colour" })).toBeTruthy()
    await user.click(
      screen.getByRole("button", { name: "Remove the third colour" })
    )
    expect(lastCall(onChange).third).toBeNull()
  })

  it("derives the dark surface from the text colour until one is chosen", async () => {
    const { onChange, user, rerender } = setup()
    expect(screen.queryByRole("textbox", { name: "Dark surface" })).toBeNull()
    expect(screen.getByText(/Derived from the text colour/)).toBeTruthy()
    await user.click(
      screen.getByRole("button", { name: "Choose a dark surface" })
    )
    const chosen = lastCall(onChange).darkSurface
    expect(chosen).toMatch(/^#[0-9a-f]{6}$/)

    rerender(
      <ThemeControls
        value={{ ...DEFAULT_INPUTS, darkSurface: chosen }}
        onChange={onChange}
        fonts={fonts}
      />
    )
    await user.click(
      screen.getByRole("button", { name: "Derive the dark surface again" })
    )
    expect(lastCall(onChange).darkSurface).toBeNull()
  })

  it("picks the heading and body fonts from built-ins and stored Fonts", async () => {
    const { onChange, user } = setup()
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Heading font" }),
      "font:7"
    )
    expect(lastCall(onChange).headingFont).toBe("font:7")
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Body font" }),
      "built-in:Karla"
    )
    expect(lastCall(onChange).bodyFont).toBe("built-in:Karla")
  })

  it("offers every built-in and stored Font, and keeps a hidden current one", () => {
    setup({ ...DEFAULT_INPUTS, bodyFont: "font:99" })
    const heading = screen.getByRole("combobox", { name: "Heading font" })
    const keys = within(heading)
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value)
    expect(keys).toEqual(expect.arrayContaining(fonts.map((f) => f.key)))
    const body = screen.getByRole<HTMLSelectElement>("combobox", {
      name: "Body font",
    })
    expect(body.value).toBe("font:99")
  })

  it("links to Assets › Fonts to add a Google Font", () => {
    setup(DEFAULT_INPUTS, builtIns)
    const link = screen.getByRole("link", { name: /Google Font/ })
    expect(link.getAttribute("href")).toBe("/admin/settings/assets/fonts")
  })

  const choices: [keyof ThemeInputs, string, string, string][] = [
    ["neutralTint", "Neutral tint", "Warm", "warm"],
    ["headingWeight", "Heading weight", "Black", "black"],
    ["headingCase", "Heading case", "UPPERCASE", "uppercase"],
    ["buttonCorners", "Button corners", "Square", "square"],
    ["cardCorners", "Card corners", "Rounded", "rounded"],
    ["spacing", "Spacing", "Compact", "compact"],
    ["shadows", "Shadows", "Lifted", "lifted"],
    ["buttonStyle", "Button style", "Outline", "outline"],
    ["buttonLetters", "Button letters", "Title Case", "title"],
    ["buttonWeight", "Button weight", "Bold", "bold"],
    ["motion", "Motion", "None", "none"],
  ]
  it.each(choices)(
    "%s: choosing %s › %s sets %s",
    async (key, group, label, stored) => {
      // The choice must be a real change from where the Theme starts.
      const start = DEFAULT_INPUTS
      expect(start[key]).not.toBe(stored)
      const { onChange, user } = setup(start)
      const scope = screen.getByRole("radiogroup", { name: group })
      await user.click(within(scope).getByRole("radio", { name: label }))
      expect(lastCall(onChange)).toEqual({ ...start, [key]: stored })
    }
  )

  it("does not clear a choice by pressing it again", async () => {
    const { onChange, user } = setup()
    const scope = screen.getByRole("radiogroup", { name: "Spacing" })
    await user.click(
      within(scope).getByRole("radio", { name: "Comfortable", checked: true })
    )
    expect(onChange).not.toHaveBeenCalled()
  })

  it("shows the help for Button style", () => {
    setup()
    expect(screen.getByText(/Style applies to primary buttons/)).toBeTruthy()
  })
})

describe("contrast warnings", () => {
  const pale: ThemeInputs = { ...DEFAULT_INPUTS, text: "#d0d0d0" }

  it("shows no warnings for a Theme that passes", () => {
    setup()
    expect(screen.queryByRole("button", { name: /Apply fix/ })).toBeNull()
    expect(screen.queryByText(/Contrast warnings/)).toBeNull()
  })

  it("lists a failing pair with a fix that makes it pass", async () => {
    expect(contrastWarnings(pale).length).toBeGreaterThan(0)
    const { onChange, user } = setup(pale)
    const region = screen.getByRole("region", { name: "Contrast warnings" })
    expect(within(region).getByText(/too pale to read/)).toBeTruthy()

    await user.click(within(region).getByRole("button", { name: /Apply fix/ }))
    const fixed = lastCall(onChange)
    expect(fixed.text).not.toBe(pale.text)
    expect(contrastWarnings(fixed)).toEqual([])
  })

  it("clears the warning once the fix is applied", async () => {
    const user = userEvent.setup()
    render(<Harness initial={pale} />)
    await user.click(screen.getByRole("button", { name: /Apply fix/ }))
    expect(screen.queryByRole("button", { name: /Apply fix/ })).toBeNull()
    expect(
      screen.queryByRole("region", { name: "Contrast warnings" })
    ).toBeNull()
  })

  it("warns about a pale primary only while buttons are outlined", async () => {
    const outlined: ThemeInputs = {
      ...DEFAULT_INPUTS,
      primary: "#c8d8e8",
      buttonStyle: "outline",
    }
    const user = userEvent.setup()
    render(<Harness initial={outlined} />)
    expect(screen.getByText(/edge of outline buttons/)).toBeTruthy()
    await user.click(screen.getByRole("button", { name: /Apply fix/ }))
    expect(screen.queryByText(/edge of outline buttons/)).toBeNull()
  })
})

describe("accessibility", () => {
  async function violations(container: HTMLElement) {
    const results = await axe.run(container, {
      // jsdom has no layout or paint.
      rules: { "color-contrast": { enabled: false } },
    })
    return results.violations.map((v) => `${v.id}: ${v.help}`)
  }

  it("has no axe violations", async () => {
    const { container } = setup()
    expect(await violations(container)).toEqual([])
  })

  it("has none with warnings, a third colour and a dark surface set", async () => {
    const { container } = setup({
      ...presetInputs(AVADA, fonts),
      third: "#224466",
      text: "#d0d0d0",
    })
    expect(
      screen.getByRole("region", { name: "Contrast warnings" })
    ).toBeTruthy()
    expect(await violations(container)).toEqual([])
  })
})
