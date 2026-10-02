// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GuestSurveyFlow } from "./GuestSurveyFlow"
import { guestSurveySample } from "./samples/guestSurvey"

afterEach(cleanup)

const place = { index: 0, editing: false }

function draw(
  over: Partial<typeof guestSurveySample> = {},
  submit = vi.fn(async () => true)
) {
  render(
    <GuestSurveyFlow
      block={{ ...guestSurveySample, ...over }}
      first
      context={place}
      submit={submit}
    />
  )
  return { submit, user: userEvent.setup() }
}

const star = (name: string) => screen.getByRole("radio", { name })
const heading = () => screen.getByRole("heading").textContent

describe("the rating", () => {
  it("is five stars in a group named by the heading, the Page's h1", () => {
    draw()
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "How was your stay with Seaglass?"
    )
    expect(
      screen.getByRole("radiogroup", {
        name: "How was your stay with Seaglass?",
      })
    ).toBeTruthy()
    expect(
      screen.getAllByRole("radio").map((r) => r.parentElement!.textContent)
    ).toEqual([
      "1 star – Poor",
      "2 stars – Fair",
      "3 stars – Good",
      "4 stars – Great",
      "5 stars – Excellent",
    ])
  })

  it("moves on at a click, to the review request for a high rating", async () => {
    const { user } = draw()
    await user.click(star("5 stars – Excellent"))
    expect(heading()).toBe("We’re so glad you enjoyed your stay.")
    expect(document.activeElement).toBe(screen.getByRole("heading"))
    expect(screen.getByText("You chose 5 stars – Excellent.")).toBeTruthy()
    const review = screen.getByRole("link", { name: "Leave a Google review" })
    expect(review.getAttribute("href")).toBe("https://example.com/review")
  })

  it("from the keyboard, chooses with the arrows and moves on with Enter", async () => {
    const { user } = draw()
    const two = star("2 stars – Fair")
    // An arrow key selects a radio by clicking it, with no pointer behind it.
    fireEvent.click(two, { detail: 0 })
    expect(heading()).toBe("How was your stay with Seaglass?")
    expect(screen.getByRole("status").textContent).toBe(
      "2 stars – Fair. Press Enter to continue."
    )
    two.focus()
    await user.keyboard("{Enter}")
    expect(heading()).toBe("We’re sorry your stay wasn’t what you expected.")
  })

  it("can be changed from the next step", async () => {
    const { user } = draw()
    await user.click(star("4 stars – Great"))
    await user.click(screen.getByRole("button", { name: "Change rating" }))
    expect(heading()).toBe("How was your stay with Seaglass?")
    expect((star("4 stars – Great") as HTMLInputElement).checked).toBe(true)
  })

  it("keeps the review request for 5 stars when the Block says so", async () => {
    const { user } = draw({ reviewFrom: "5" })
    await user.click(star("4 stars – Great"))
    expect(heading()).toBe("We’re sorry your stay wasn’t what you expected.")
  })
})

describe("a high rating", () => {
  it("thanks a guest who skips the review", async () => {
    const { user } = draw()
    await user.click(star("4 stars – Great"))
    await user.click(screen.getByRole("button", { name: "Maybe later" }))
    expect(heading()).toBe("Thanks for staying with us.")
    expect(screen.getByText("We hope to welcome you back soon.")).toBeTruthy()
  })

  it("shows no review button until the Block has a link", async () => {
    const { user } = draw({
      positive: { ...guestSurveySample.positive, reviewUrl: "" },
    })
    await user.click(star("5 stars – Excellent"))
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByRole("button", { name: "Maybe later" })).toBeTruthy()
  })
})

describe("a lower rating", () => {
  async function toForm(over?: Parameters<typeof draw>[0], submit?: never) {
    const drawn = draw(over, submit)
    await drawn.user.click(star("2 stars – Fair"))
    return drawn
  }

  it("asks for the message, then the Block's optional fields in order", async () => {
    await toForm({
      negative: {
        ...guestSurveySample.negative,
        formFields: ["checkIn", "email"],
      },
    })
    expect(
      screen.getAllByRole("textbox").map((el) => el.getAttribute("name"))
    ).toEqual(["message", "email"])
    expect(screen.getByLabelText(/Check-in date/).getAttribute("type")).toBe(
      "date"
    )
    expect(
      screen.getByRole("checkbox", {
        name: "It’s okay to contact me about this.",
      })
    ).toBeTruthy()
  })

  it("won't send without a message, and says so at the field", async () => {
    const { user, submit } = await toForm()
    await user.click(screen.getByRole("button", { name: "Send feedback" }))
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole("alert").textContent).toBe(
      "Please fix the highlighted field to continue."
    )
    const message = screen.getByLabelText(
      "How could we have improved your stay?"
    )
    expect(message.getAttribute("aria-invalid")).toBe("true")
    expect(document.activeElement).toBe(message)
  })

  it("sends the answers with the rating, and says they were sent", async () => {
    const { user, submit } = await toForm()
    await user.type(
      screen.getByLabelText("How could we have improved your stay?"),
      "Cold shower."
    )
    await user.type(screen.getByLabelText(/Email/), "ana@example.com")
    await user.click(screen.getByRole("checkbox"))
    await user.click(screen.getByRole("button", { name: "Send feedback" }))
    expect(submit).toHaveBeenCalledWith({
      rating: 2,
      message: "Cold shower.",
      email: "ana@example.com",
      consent: true,
      website: "",
      page: "/",
    })
    expect(heading()).toBe(
      "Thank you. Our team has your feedback and will be in touch."
    )
    const call = screen.getByRole("link", { name: "+1 555 010 0100" })
    expect(call.getAttribute("href")).toBe("tel:+15550100100")
  })

  it("keeps the answers when it can't send, and tries again", async () => {
    const submit = vi
      .fn<(body: object) => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const { user } = draw({}, submit as never)
    await user.click(star("1 star – Poor"))
    await user.type(
      screen.getByLabelText("How could we have improved your stay?"),
      "No hot water."
    )
    await user.click(screen.getByRole("button", { name: "Send feedback" }))
    expect(heading()).toBe("We couldn’t send your feedback.")
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(submit).toHaveBeenCalledTimes(2)
    expect(submit.mock.calls[1]![0]).toMatchObject({
      rating: 1,
      message: "No hot water.",
    })
    expect(heading()).toBe(
      "Thank you. Our team has your feedback and will be in touch."
    )
  })
})

describe("in the Visual Editor", () => {
  it("sends nothing", async () => {
    const submit = vi.fn(async () => true)
    render(
      <GuestSurveyFlow
        block={guestSurveySample}
        first={false}
        context={{ index: 2, editing: true }}
        submit={submit}
      />
    )
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy()
    const user = userEvent.setup()
    await user.click(star("1 star – Poor"))
    await user.type(
      screen.getByLabelText("How could we have improved your stay?"),
      "Test"
    )
    await user.click(screen.getByRole("button", { name: "Send feedback" }))
    expect(submit).not.toHaveBeenCalled()
    expect(heading()).toContain("Thank you.")
  })
})
