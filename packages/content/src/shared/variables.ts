/**
 * Variables (apps/cms/GLOSSARY.md, ADR-0017): named values such as `{phone}` that
 * Pages and Guides store as typed and apps/site replaces when it reads
 * content. Pure; apps/cms uses the same names and scanner to validate on
 * save, so both apps agree on what a Variable is.
 *
 * A Variable sits inside one string (one Lexical text run). `{ph` in one run
 * and `one}` in the next is not a Variable; `findVariableIssues` reports it
 * as literal braces.
 */

/** The built-in Variables, taken from Site Settings, in help-panel order. */
export const builtInVariables = [
  "site",
  "client",
  "client-url",
  "phone",
  "email",
  "domain",
  "address",
] as const

export type BuiltInVariable = (typeof builtInVariables)[number]

/** Where each built-in Variable's value comes from, for the admin. */
export const builtInVariableSources: Record<BuiltInVariable, string> = {
  site: "The Site's name",
  client: "The Client's name",
  "client-url": "The Client's website",
  phone: "Branding & contact: phone",
  email: "Branding & contact: email",
  domain: "The Site's domain",
  address: "Branding & contact: address",
}

/** The Site fields Variables are built from (a Site document, at any depth). */
export type VariableSource = {
  name?: string | null
  domain?: string | null
  client?: { name?: string | null; website?: string | null } | null
  branding?: {
    phone?: string | null
    email?: string | null
    address?: string | null
  } | null
  customVariables?: { key?: string | null; value?: string | null }[] | null
}

/** Variable name → value. Every built-in is present; empty when not set. */
export type VariableValues = Readonly<Record<string, string>>

/** Lowercase kebab-case: `wifi-password`, `season2`. */
const VARIABLE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Anything in braces without spaces or nested braces: a Variable, or an attempt at one. */
const CANDIDATE = /\{([^{}\s]+)\}/g

export function isVariableName(value: string): boolean {
  return VARIABLE_NAME.test(value)
}

export function isBuiltInVariable(name: string): name is BuiltInVariable {
  return (builtInVariables as readonly string[]).includes(name)
}

/**
 * A Custom Variable key: lowercase kebab-case, not a built-in name and not
 * used twice. `true`, or the message for the admin.
 */
export function validateVariableKey(
  key: string | null | undefined,
  otherKeys: readonly (string | null | undefined)[] = []
): true | string {
  if (!key) return "Enter a key, such as wifi-password."
  if (!isVariableName(key)) {
    return "Use lowercase letters, digits and dashes, such as wifi-password."
  }
  if (isBuiltInVariable(key)) {
    return `{${key}} is a built-in Variable. Choose another key.`
  }
  if (otherKeys.includes(key)) return `{${key}} is already defined.`
  return true
}

const clean = (value: string | null | undefined) => value?.trim() ?? ""

/** Every Variable of a Site: the built-ins from Site Settings, then its Custom Variables. */
export function variableValuesFrom(site: VariableSource): VariableValues {
  const values: Record<string, string> = {
    site: clean(site.name),
    client: clean(site.client?.name),
    "client-url": clean(site.client?.website),
    phone: clean(site.branding?.phone),
    email: clean(site.branding?.email),
    domain: clean(site.domain),
    address: clean(site.branding?.address),
  }
  for (const row of site.customVariables ?? []) {
    const key = clean(row?.key)
    if (isVariableName(key) && !isBuiltInVariable(key) && !(key in values)) {
      values[key] = clean(row?.value)
    }
  }
  return values
}

/** Whether two Sites' Variables differ (a Site Settings change touching a Variable). */
export function variablesChanged(
  a: VariableValues,
  b: VariableValues
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].some((key) => a[key] !== b[key])
}

/** Replaces known Variables in `text`. Unknown names stay as typed. */
export function resolveVariables(text: string, values: VariableValues): string {
  if (!text.includes("{")) return text
  return text.replace(CANDIDATE, (match, name: string) =>
    Object.hasOwn(values, name) ? values[name]! : match
  )
}

/**
 * `value` with Variables replaced in every string inside it: Block fields,
 * SEO fields, link labels and URLs, and the text runs of Lexical rich text.
 * Object keys are left alone. Returns a copy.
 */
export function resolveVariablesDeep<T>(value: T, values: VariableValues): T {
  if (typeof value === "string") return resolveVariables(value, values) as T
  if (Array.isArray(value)) {
    return value.map((item) => resolveVariablesDeep(item, values)) as T
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        resolveVariablesDeep(entry, values),
      ])
    ) as T
  }
  return value
}

export type VariableIssue =
  /** Not a Variable of this Site. Blocks publishing. */
  | { kind: "unknown"; name: string }
  /** A known Variable with no value: renders as empty. A warning. */
  | { kind: "empty"; name: string }
  /** A `{` or `}` that isn't part of a Variable, e.g. one split across text runs. A warning. */
  | { kind: "literalBraces"; text: string }

/** The Variable problems in one string. */
export function findVariableIssues(
  text: string,
  values: VariableValues
): VariableIssue[] {
  if (!text.includes("{") && !text.includes("}")) return []
  const issues: VariableIssue[] = []
  for (const [, name] of text.matchAll(CANDIDATE)) {
    if (!Object.hasOwn(values, name!)) {
      issues.push({ kind: "unknown", name: name! })
    } else if (values[name!] === "") {
      issues.push({ kind: "empty", name: name! })
    }
  }
  if (/[{}]/.test(text.replace(CANDIDATE, ""))) {
    issues.push({ kind: "literalBraces", text })
  }
  return issues
}

/** A Variable problem at a field path, e.g. `layout.1.intro` or `seo.title`. */
export type FieldVariableIssue = VariableIssue & { path: string }

const isRichText = (value: object): boolean =>
  "root" in value &&
  typeof (value as { root?: unknown }).root === "object" &&
  (value as { root: { type?: unknown } | null }).root?.type === "root"

/**
 * Every Variable problem in a document's fields, with the path of the field
 * it is in. Rich text reports the rich text field's path, not the node's.
 */
export function collectVariableIssues(
  value: unknown,
  values: VariableValues,
  path = ""
): FieldVariableIssue[] {
  // `field`: the rich text field a node is inside, else undefined.
  const walk = (
    node: unknown,
    at: string,
    field?: string
  ): FieldVariableIssue[] => {
    if (typeof node === "string") {
      return findVariableIssues(node, values).map((issue) => ({
        ...issue,
        path: field ?? at,
      }))
    }
    if (node === null || typeof node !== "object") return []
    const within = field ?? (isRichText(node) ? at : undefined)
    const entries = Array.isArray(node)
      ? node.map((item, i) => [String(i), item] as const)
      : Object.entries(node)
    return entries.flatMap(([key, entry]) => walk(entry, join(at, key), within))
  }
  return walk(value, path)
}

const join = (path: string, key: string) => (path ? `${path}.${key}` : key)
