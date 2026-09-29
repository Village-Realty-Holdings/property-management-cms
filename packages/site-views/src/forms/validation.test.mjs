// Run with `node --test` (Node strips the types from validation.ts).
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  fieldForCmsPath,
  isSubmissionKind,
  readFields,
  validateSubmission,
} from "./validation.ts"

const TODAY = "2026-09-25"
const person = { name: "Ada Guest", email: "ada@example.com" }

const errorsOf = (kind, values) => {
  const result = validateSubmission(kind, values, TODAY)
  return result.ok ? {} : result.errors
}

describe("readFields", () => {
  it("keeps the kind's fields, trimmed, and drops empty and unknown ones", () => {
    const data = new Map([
      ["name", "  Ada  "],
      ["email", "ada@example.com"],
      ["phone", "   "],
      ["guests", "4"],
      ["website", "spam"],
    ])
    assert.deepEqual(
      readFields("contact", (key) => data.get(key)),
      { name: "Ada", email: "ada@example.com" }
    )
    assert.deepEqual(
      readFields("inquiry", (key) => data.get(key)),
      { name: "Ada", email: "ada@example.com", guests: "4" }
    )
  })

  it("ignores non-string values (files)", () => {
    assert.deepEqual(
      readFields("contact", () => new Blob(["x"])),
      {}
    )
  })
})

describe("validateSubmission: every kind", () => {
  it("requires a name and a valid email", () => {
    assert.deepEqual(errorsOf("ownerLead", { propertyLocation: "Aspen" }), {
      name: "Enter your name.",
      email: "Enter your email address.",
    })
    assert.match(
      errorsOf("inquiry", { name: "Ada", email: "not-an-email" }).email,
      /name@example.com/
    )
  })

  it("checks an optional phone number", () => {
    assert.equal(
      errorsOf("inquiry", { ...person, phone: "+1 (555) 010-0100" }).phone,
      undefined
    )
    assert.ok(errorsOf("inquiry", { ...person, phone: "call me" }).phone)
    assert.ok(errorsOf("inquiry", { ...person, phone: "12" }).phone)
  })

  it("limits lengths", () => {
    assert.match(
      errorsOf("contact", { ...person, name: "x".repeat(121), message: "Hi" })
        .name,
      /at most 120/
    )
  })
})

describe("validateSubmission: contact", () => {
  it("requires a message", () => {
    assert.deepEqual(errorsOf("contact", person), {
      message: "Enter your message.",
    })
  })

  it("builds the Submission with the fields in its payload", () => {
    const result = validateSubmission(
      "contact",
      { ...person, message: "Hello" },
      TODAY
    )
    assert.deepEqual(result, {
      ok: true,
      submission: {
        kind: "contact",
        name: "Ada Guest",
        email: "ada@example.com",
        phone: undefined,
        message: "Hello",
        payload: { ...person, message: "Hello" },
      },
    })
  })
})

describe("validateSubmission: inquiry", () => {
  it("accepts a stay about a Property", () => {
    const result = validateSubmission(
      "inquiry",
      {
        ...person,
        arrival: "2026-12-20",
        departure: "2026-12-27",
        guests: "6",
        property: "bear-hollow-lodge",
      },
      TODAY
    )
    assert.equal(result.ok, true)
    assert.equal(result.submission.arrival, "2026-12-20")
    assert.equal(result.submission.departure, "2026-12-27")
    assert.equal(result.submission.guests, 6)
    assert.equal(result.submission.message, undefined)
    assert.deepEqual(result.submission.payload, {
      ...person,
      arrival: "2026-12-20",
      departure: "2026-12-27",
      guests: 6,
      propertySlug: "bear-hollow-lodge",
    })
  })

  it("rejects impossible, past and reversed dates", () => {
    assert.equal(
      errorsOf("inquiry", {
        ...person,
        arrival: "2026-02-30",
        departure: "2026-03-02",
      }).arrival,
      "Enter a valid date."
    )
    assert.match(
      errorsOf("inquiry", {
        ...person,
        arrival: "2026-09-01",
        departure: "2026-09-05",
      }).arrival,
      /from today/
    )
    assert.match(
      errorsOf("inquiry", {
        ...person,
        arrival: "2026-10-05",
        departure: "2026-10-05",
      }).departure,
      /after your arrival/
    )
  })

  it("allows yesterday (UTC) for guests behind UTC", () => {
    assert.deepEqual(
      errorsOf("inquiry", {
        ...person,
        arrival: "2026-09-24",
        departure: "2026-09-26",
      }),
      {}
    )
  })

  it("needs both dates or neither", () => {
    assert.match(
      errorsOf("inquiry", { ...person, arrival: "2026-10-01" }).departure,
      /departure/
    )
    assert.match(
      errorsOf("inquiry", { ...person, departure: "2026-10-01" }).arrival,
      /arrival/
    )
    assert.deepEqual(errorsOf("inquiry", person), {})
  })

  it("checks guests", () => {
    assert.ok(errorsOf("inquiry", { ...person, guests: "0" }).guests)
    assert.ok(errorsOf("inquiry", { ...person, guests: "2.5" }).guests)
    assert.ok(errorsOf("inquiry", { ...person, guests: "100" }).guests)
  })

  it("caps guests at what the Property sleeps, when known", () => {
    const values = { ...person, guests: "9", property: "bear-hollow-lodge" }
    const lodge = { name: "Bear Hollow Lodge", sleeps: 8 }
    assert.equal(
      validateSubmission("inquiry", values, TODAY, lodge).errors?.guests,
      "This home sleeps up to 8."
    )
    assert.equal(validateSubmission("inquiry", values, TODAY).ok, true)
    assert.equal(
      validateSubmission("inquiry", values, TODAY, { ...lodge, sleeps: null })
        .ok,
      true
    )
  })

  it("drops a malformed Property slug instead of failing", () => {
    const result = validateSubmission(
      "inquiry",
      { ...person, property: "../admin" },
      TODAY
    )
    assert.equal(result.ok, true)
    assert.equal(result.submission.payload.propertySlug, undefined)
  })
})

describe("validateSubmission: owner lead", () => {
  it("requires the property's location and checks bedrooms", () => {
    assert.deepEqual(errorsOf("ownerLead", { ...person, bedrooms: "x" }), {
      propertyLocation: "Tell us where your property is.",
      bedrooms: "Enter a number of bedrooms from 0 to 50.",
    })
  })

  it("puts the address and bedrooms in the payload", () => {
    const result = validateSubmission(
      "ownerLead",
      { ...person, propertyLocation: "12 Ridge Rd, Aspen", bedrooms: "3" },
      TODAY
    )
    assert.equal(result.ok, true)
    assert.deepEqual(result.submission.payload, {
      ...person,
      propertyLocation: "12 Ridge Rd, Aspen",
      bedrooms: 3,
    })
  })
})

describe("kinds and CMS errors", () => {
  it("knows the three kinds", () => {
    assert.ok(["inquiry", "ownerLead", "contact"].every(isSubmissionKind))
    assert.equal(isSubmissionKind("newsletter"), false)
    assert.equal(isSubmissionKind(undefined), false)
  })

  it("maps CMS field paths to the kind's fields", () => {
    assert.equal(fieldForCmsPath("contact", "email"), "email")
    assert.equal(fieldForCmsPath("contact", "guests"), undefined)
    assert.equal(fieldForCmsPath("inquiry", "guests"), "guests")
    assert.equal(fieldForCmsPath("inquiry", "property"), undefined)
    assert.equal(fieldForCmsPath("inquiry", "payload"), undefined)
  })
})
