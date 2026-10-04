import { describe, expect, it } from "vitest"

import {
  parseGuestFeedback,
  pathFor,
  phoneParts,
  ratingName,
  validateFeedback,
} from "./guestSurvey"

describe("where a rating leads", () => {
  it("asks 4 and 5 stars for a review, and the rest for feedback", () => {
    expect([1, 2, 3, 4, 5].map((n) => pathFor(n, "4"))).toEqual([
      "negative",
      "negative",
      "negative",
      "positive",
      "positive",
    ])
  })

  it("can keep the review request for 5 stars only", () => {
    expect(pathFor(4, "5")).toBe("negative")
    expect(pathFor(5, "5")).toBe("positive")
    expect(pathFor(4, null)).toBe("positive")
  })

  it("names a rating as a screen reader hears it", () => {
    expect(ratingName(1)).toBe("1 star – Poor")
    expect(ratingName(5)).toBe("5 stars – Excellent")
  })
})

describe("a guest's answers", () => {
  it("need only the message", () => {
    expect(validateFeedback({ message: " " })).toEqual({
      message: "Tell us what happened.",
    })
    expect(validateFeedback({ message: "The heating was off." })).toEqual({})
  })

  it("must be sensible where they are given", () => {
    expect(
      validateFeedback({
        message: "x".repeat(2001),
        email: "nope",
        phone: "12",
        checkIn: "next week",
        name: "n".repeat(201),
      })
    ).toEqual({
      message: "Keep your message to 2000 characters or fewer.",
      email: "Enter an email address like name@example.com.",
      phone: "Enter a phone number of at least 7 digits.",
      checkIn: "Enter the date as year, month and day.",
      name: "Keep this to 200 characters or fewer.",
    })
  })
})

describe("feedback that arrives from a browser", () => {
  it("is cleaned: trimmed, empty answers dropped, unknown ones ignored", () => {
    expect(
      parseGuestFeedback({
        rating: 2,
        message: "  Cold shower.  ",
        name: " Ana ",
        email: "",
        consent: true,
        page: "/survey",
        admin: true,
      })
    ).toEqual({
      ok: true,
      feedback: {
        rating: 2,
        message: "Cold shower.",
        name: "Ana",
        consent: true,
        page: "/survey",
      },
    })
  })

  it("needs a rating from 1 to 5", () => {
    for (const rating of [0, 6, 2.5, "3", undefined]) {
      expect(parseGuestFeedback({ rating, message: "Hi" })).toMatchObject({
        ok: false,
        message: "Choose a rating first.",
      })
    }
  })

  it("is refused with the field errors when an answer is wrong", () => {
    expect(parseGuestFeedback({ rating: 1, message: "" })).toEqual({
      ok: false,
      message: "Some answers need attention.",
      errors: { message: "Tell us what happened." },
    })
  })

  it("only takes consent that was given, and a path for the Page", () => {
    const parsed = parseGuestFeedback({
      rating: 1,
      message: "Hi",
      consent: "yes",
      page: "https://evil.test/",
    })
    expect(parsed.ok && parsed.feedback).toMatchObject({
      consent: false,
      page: "/",
    })
  })
})

describe("a step's text with the guest care number", () => {
  it("cuts {phone} out as its own part", () => {
    expect(phoneParts("Call us at {phone}.", "+1 555 010 0100")).toEqual([
      "Call us at ",
      "{phone}",
      ".",
    ])
  })

  it("drops the sentence that needs the number when there is none", () => {
    expect(
      phoneParts("Your answers are still here. Try again, or call {phone}.", "")
    ).toEqual(["Your answers are still here."])
    expect(phoneParts("Prefer to talk now? Call us at {phone}.", null)).toEqual(
      ["Prefer to talk now?"]
    )
    expect(phoneParts("Call {phone}.", undefined)).toEqual([])
  })

  it("leaves text without the token alone", () => {
    expect(phoneParts(" See you soon. ", null)).toEqual(["See you soon."])
    expect(phoneParts(null, "1")).toEqual([])
  })
})
