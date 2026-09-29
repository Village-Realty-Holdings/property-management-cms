/**
 * Run with `node --test apps/site/components/editorial/format.test.ts`
 * (Node 24 strips the types; apps/site has no test runner yet).
 */
import assert from "node:assert/strict"
import { test } from "node:test"

type Format = typeof import("./format")
// Node needs the extension; the Next tsconfig doesn't allow it in imports.
const { formatDate, formatValidity, isExpired, jsonLd, pageParam } =
  (await import(new URL("./format.ts", import.meta.url).href)) as Format

test("formatDate formats UTC dates without shifting the day", () => {
  assert.equal(formatDate("2026-06-01T00:00:00.000Z"), "June 1, 2026")
  assert.equal(formatDate(null), null)
  assert.equal(formatDate("not a date"), null)
})

test("formatValidity describes each shape of window", () => {
  // Intl puts thin spaces around the en dash.
  assert.equal(
    formatValidity(
      "2026-01-01T00:00:00.000Z",
      "2026-12-31T00:00:00.000Z"
    )?.replace(/\s/g, " "),
    "January 1 – December 31, 2026"
  )
  assert.equal(
    formatValidity(null, "2026-12-31T00:00:00.000Z"),
    "Until December 31, 2026"
  )
  assert.equal(
    formatValidity("2026-01-01T00:00:00.000Z", null),
    "From January 1, 2026"
  )
  assert.equal(formatValidity(null, null), null)
})

test("isExpired only when validTo is in the past", () => {
  const now = Date.parse("2026-09-25T12:00:00.000Z")
  assert.equal(isExpired({ validTo: "2025-10-31T00:00:00.000Z" }, now), true)
  // Still current through its last day.
  assert.equal(isExpired({ validTo: "2026-09-25T00:00:00.000Z" }, now), false)
  assert.equal(isExpired({ validTo: "2026-09-24T00:00:00.000Z" }, now), true)
  assert.equal(isExpired({ validTo: "2099-12-31T00:00:00.000Z" }, now), false)
  assert.equal(isExpired({ validTo: null }, now), false)
})

test("pageParam accepts positive integers only", () => {
  assert.equal(pageParam("3"), 3)
  assert.equal(pageParam(["2", "5"]), 2)
  for (const bad of [undefined, "", "0", "-1", "1.5", "abc", "1e3"]) {
    assert.equal(pageParam(bad), 1)
  }
})

test("jsonLd escapes < so text cannot close the script", () => {
  assert.equal(
    jsonLd({ a: "</script><b>" }),
    '{"a":"\\u003c/script>\\u003cb>"}'
  )
})
