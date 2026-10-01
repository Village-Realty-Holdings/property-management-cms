import type { Field } from "payload"
import { describe, expect, it } from "vitest"

import { validateHref } from "../../../fields/link"
import { validateField } from "./validate"

const check = (field: Field, value: unknown) =>
  validateField(field, value, { data: {}, siblingData: {} })

describe("validateField", () => {
  it("asks for a required value", () => {
    const field: Field = { name: "heading", type: "text", required: true }
    expect(check(field, "")).toBe("This field is required.")
    expect(check(field, undefined)).toBe("This field is required.")
    expect(check(field, "Hi")).toBeNull()
  })

  it("does not ask for an optional value", () => {
    expect(check({ name: "a", type: "text" }, "")).toBeNull()
  })

  it("checks text length", () => {
    const field: Field = { name: "text", type: "text", maxLength: 5 }
    expect(check(field, "123456")).toBe(
      "Use 5 characters or fewer. This has 6."
    )
    expect(check({ name: "t", type: "textarea", minLength: 3 }, "ab")).toBe(
      "Use at least 3 characters. This has 2."
    )
  })

  it("checks a number's range", () => {
    const field: Field = { name: "rating", type: "number", min: 1, max: 5 }
    expect(check(field, 0)).toBe("Use a number of 1 or more.")
    expect(check(field, 6)).toBe("Use a number of 5 or less.")
    expect(check(field, 3)).toBeNull()
    expect(check(field, null)).toBeNull()
    expect(check({ ...field, required: true }, null)).toBe(
      "This field is required."
    )
  })

  it("requires a checkbox to be ticked only when it is required", () => {
    expect(check({ name: "ok", type: "checkbox" }, false)).toBeNull()
    expect(check({ name: "ok", type: "checkbox", required: true }, false)).toBe(
      "This field is required."
    )
  })

  it("checks an array's number of rows", () => {
    const field: Field = {
      name: "steps",
      type: "array",
      minRows: 3,
      maxRows: 4,
      fields: [],
    }
    expect(check(field, [{}])).toBe("Add at least 3 rows. There is 1.")
    expect(check(field, [{}, {}, {}, {}, {}])).toBe(
      "Use at most 4 rows. There are 5."
    )
    expect(check(field, [{}, {}, {}])).toBeNull()
  })

  it("runs the field's own validation", () => {
    const field: Field = { name: "href", type: "text", validate: validateHref }
    expect(check(field, "nope")).toBe(
      'Use a Site path like "/about" or a full https:// URL.'
    )
    expect(check(field, "/about")).toBeNull()
  })

  it("passes the field's siblings to its own validation", () => {
    const field: Field = {
      name: "b",
      type: "text",
      validate: (_: unknown, { siblingData }: { siblingData: unknown }) =>
        (siblingData as { a?: string }).a ? true : "Fill in a first.",
    }
    expect(
      validateField(field, "x", { data: {}, siblingData: { a: "" } })
    ).toBe("Fill in a first.")
  })

  it("leaves a field whose own validation throws as valid", () => {
    const field: Field = {
      name: "a",
      type: "text",
      validate: () => {
        throw new Error("needs the server")
      },
    }
    expect(check(field, "x")).toBeNull()
  })
})
