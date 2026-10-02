import { NotFound, type Payload } from "payload"

import { getAvailableFonts, type AvailableFont } from "../fonts/available"
import {
  describeChanges,
  inputProblems,
  INPUT_LABELS,
  normalizeInputs,
  type ThemeInputs,
} from "../theme/inputs"
import {
  BRAND_PRESETS,
  GENERAL_PRESETS,
  PRESETS,
  presetInputs,
} from "../theme/presets"
import { FALLBACK_INPUTS, readLiveTheme, saveTheme } from "../theme/record"
import { parseFontKey } from "../theme/record/fontKeys"
import type { Swatch } from "./dashboard/site"
import { formStateFromError, type FormState } from "./formState"
import type { StaffAccess } from "./theme/themeScreen"

/**
 * The Themes screen (Tools): the built-in presets and the Saved Themes, and
 * applying, saving, renaming, deleting, exporting and importing them, through
 * the Local API as the Staff User (apps/site ADR-0002, ADR-0009). The Site
 * has one Theme (ADR-0004): applying one of these saves the Theme, so it is
 * live at once and the Theme's history can put the earlier one back.
 */

/** One Theme in the list. `id` is "preset:<id>" or "saved:<id>". */
export type ThemeCard = {
  id: string
  name: string
  kind: "General" | "Brand" | "Saved"
  /** A preset's one-line description. */
  blurb: string | null
  swatches: Swatch[]
  /** "Fraunces and Nunito Sans": the heading and body fonts. */
  fonts: string
  /** Whether the Site's Theme is exactly this one. */
  live: boolean
}

/** A Theme as a file: its fonts are family names, so it fits any Site. */
export type ThemeFile = {
  awaydayTheme: 1
  name: string
  inputs: ThemeInputs
}

export const NAME_MAX = 60

const FONT_KEYS = ["headingFont", "bodyFont"] as const

const GONE: FormState = {
  ok: false,
  message: "That Theme is no longer in the list.",
}

const sameText = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase()

const servable = (font: AvailableFont) =>
  font.files === undefined || font.files.length > 0

const familyOf = (key: string, fonts: readonly AvailableFont[]) =>
  fonts.find((font) => font.key === key)?.family ??
  (key.startsWith("built-in:") ? key.slice("built-in:".length) : null)

const swatchesOf = (inputs: ThemeInputs): Swatch[] => [
  { name: "Primary", hex: inputs.primary },
  { name: "Accent", hex: inputs.accent },
  ...(inputs.third ? [{ name: "Third", hex: inputs.third }] : []),
  { name: "Text", hex: inputs.text },
]

type Entry = Pick<ThemeCard, "id" | "name" | "kind" | "blurb"> & {
  inputs: ThemeInputs
}

async function entries(
  payload: Payload,
  access: StaffAccess,
  fonts: readonly AvailableFont[]
): Promise<Entry[]> {
  const { docs } = await payload.find({
    collection: "saved-themes",
    pagination: false,
    sort: "name",
    depth: 0,
    ...access,
  })
  const preset =
    (kind: "General" | "Brand") => (p: (typeof PRESETS)[number]) => ({
      id: `preset:${p.id}`,
      name: p.name,
      kind,
      blurb: p.blurb,
      inputs: presetInputs(p, fonts),
    })
  return [
    ...docs.map((doc) => ({
      id: `saved:${doc.id}`,
      name: doc.name,
      kind: "Saved" as const,
      blurb: null,
      inputs: normalizeInputs(doc.inputs, FALLBACK_INPUTS),
    })),
    ...GENERAL_PRESETS.map(preset("General")),
    ...BRAND_PRESETS.map(preset("Brand")),
  ]
}

/** The Saved Themes, then the general and the brand presets. */
export async function loadThemes(
  payload: Payload,
  access: StaffAccess
): Promise<ThemeCard[]> {
  const fonts = await getAvailableFonts(payload)
  const [all, live] = await Promise.all([
    entries(payload, access, fonts),
    readLiveTheme(payload),
  ])
  return all.map(({ inputs, ...card }) => ({
    ...card,
    swatches: swatchesOf(inputs),
    fonts: FONT_KEYS.map(
      (key) => familyOf(inputs[key], fonts) ?? "a deleted Font"
    ).join(" and "),
    live: describeChanges(live.inputs, inputs).length === 0,
  }))
}

async function find(
  payload: Payload,
  access: StaffAccess,
  id: unknown
): Promise<{ entry: Entry; fonts: AvailableFont[] } | null> {
  const fonts = await getAvailableFonts(payload)
  const entry = (await entries(payload, access, fonts)).find(
    (candidate) => candidate.id === id
  )
  return entry ? { entry, fonts } : null
}

/**
 * Applies a Theme from the list: the Site's Theme is saved with its inputs,
 * live at once. A stored Font it used that has been deleted since is replaced
 * by the Classic font, and the message says so.
 */
export async function applyThemeAs(
  payload: Payload,
  access: StaffAccess,
  id: unknown
): Promise<FormState> {
  try {
    const found = await find(payload, access, id)
    if (!found) return GONE
    const { entry, fonts } = found
    const inputs = { ...entry.inputs }
    const replaced: string[] = []
    for (const key of FONT_KEYS) {
      const parsed = parseFontKey(inputs[key])
      const there =
        parsed?.kind === "built-in" ||
        fonts.some((font) => font.key === inputs[key])
      if (there) continue
      inputs[key] = FALLBACK_INPUTS[key]
      replaced.push(INPUT_LABELS[key].toLowerCase())
    }
    const saved = await saveTheme(payload, {
      user: access.user,
      inputs,
      note: `Applied the Theme “${entry.name}”`,
    })
    if (!saved.changed) {
      return { ok: true, message: `“${entry.name}” is already your Theme.` }
    }
    const fallback = replaced.length
      ? ` Its ${replaced.join(" and ")} was deleted, so the Classic font is used.`
      : ""
    return {
      ok: true,
      message: `“${entry.name}” is now live on your Site.${fallback}`,
    }
  } catch (error) {
    return formStateFromError(error)
  }
}

type Named = { ok: true; name: string } | { ok: false; message: string }

/** A Saved Theme's name: not empty, not too long, and not a preset's. */
function parseName(input: unknown): Named {
  const name = typeof input === "string" ? input.trim() : ""
  if (name === "") return { ok: false, message: "Give the Theme a name." }
  if (name.length > NAME_MAX) {
    return {
      ok: false,
      message: `Keep the name to ${NAME_MAX} characters or fewer.`,
    }
  }
  if (PRESETS.some((preset) => sameText(preset.name, name))) {
    return {
      ok: false,
      message: `“${name}” is a built-in Theme. Choose another name.`,
    }
  }
  return { ok: true, name }
}

const nameError = (error: unknown, name: string): FormState => {
  const state = formStateFromError(error)
  return state.fieldErrors?.name
    ? { ok: false, message: `Another Saved Theme is called “${name}”.` }
    : state
}

/** Keeps the Site's Theme, as it is now, in the list under `name`. */
export async function saveCurrentThemeAs(
  payload: Payload,
  access: StaffAccess,
  input: unknown
): Promise<FormState> {
  const named = parseName(input)
  if (!named.ok) return named
  try {
    const live = await readLiveTheme(payload)
    await payload.create({
      collection: "saved-themes",
      data: { name: named.name, inputs: live.inputs },
      ...access,
    })
    return { ok: true, message: `Saved as “${named.name}”.` }
  } catch (error) {
    return nameError(error, named.name)
  }
}

const savedId = (id: unknown): number | null => {
  const match =
    typeof id === "string" ? /^saved:([1-9]\d{0,9})$/.exec(id) : null
  return match ? Number(match[1]) : null
}

export async function renameSavedThemeAs(
  payload: Payload,
  access: StaffAccess,
  id: unknown,
  input: unknown
): Promise<FormState> {
  const docId = savedId(id)
  if (docId === null) return GONE
  const named = parseName(input)
  if (!named.ok) return named
  try {
    await payload.update({
      collection: "saved-themes",
      id: docId,
      data: { name: named.name },
      ...access,
    })
    return { ok: true, message: `Renamed to “${named.name}”.` }
  } catch (error) {
    if (error instanceof NotFound) return GONE
    return nameError(error, named.name)
  }
}

/** Deletes a Saved Theme. The Site's Theme is not changed, even if it matches. */
export async function deleteSavedThemeAs(
  payload: Payload,
  access: StaffAccess,
  id: unknown
): Promise<FormState> {
  const docId = savedId(id)
  if (docId === null) return GONE
  try {
    const doc = await payload.delete({
      collection: "saved-themes",
      id: docId,
      ...access,
    })
    return { ok: true, message: `Deleted the Saved Theme “${doc.name}”.` }
  } catch (error) {
    if (error instanceof NotFound) return GONE
    return formStateFromError(error)
  }
}

export type ExportResult =
  | { ok: true; filename: string; json: string }
  | { ok: false; message: string }

/** A Theme from the list as a file another Site can import. */
export async function exportThemeAs(
  payload: Payload,
  access: StaffAccess,
  id: unknown
): Promise<ExportResult> {
  const found = await find(payload, access, id)
  if (!found) return { ok: false, message: GONE.message! }
  const { entry, fonts } = found
  const inputs = { ...entry.inputs }
  for (const key of FONT_KEYS) {
    const family = familyOf(inputs[key], fonts)
    if (!family) {
      return {
        ok: false,
        message: `“${entry.name}” can't be exported: its ${INPUT_LABELS[key].toLowerCase()} was deleted. Apply it, pick a font, and save it again.`,
      }
    }
    inputs[key] = family
  }
  const file: ThemeFile = { awaydayTheme: 1, name: entry.name, inputs }
  const slug =
    entry.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "theme"
  return {
    ok: true,
    filename: `${slug}.theme.json`,
    json: `${JSON.stringify(file, null, 2)}\n`,
  }
}

export const IMPORT_MAX_BYTES = 20_000

/**
 * Adds a Theme file to the list as a Saved Theme. Nothing is applied. A file
 * that isn't a Theme, has a wrong value, or names a font this Site doesn't
 * have is refused, and the message says what to fix.
 */
export async function importThemeAs(
  payload: Payload,
  access: StaffAccess,
  text: unknown
): Promise<FormState> {
  if (typeof text !== "string" || text.length > IMPORT_MAX_BYTES) {
    return { ok: false, message: "That file is too large to be a Theme." }
  }
  let file: Partial<ThemeFile>
  try {
    file = JSON.parse(text) as Partial<ThemeFile>
  } catch {
    return { ok: false, message: "That file isn't a Theme: it isn't JSON." }
  }
  if (!file || typeof file !== "object" || file.awaydayTheme !== 1) {
    return {
      ok: false,
      message:
        "That file isn't a Theme exported from an Awayday Site (or it is from a newer version).",
    }
  }
  const problems = [
    ...Object.keys(file)
      .filter((key) => !["awaydayTheme", "name", "inputs"].includes(key))
      .map((key) => `“${key}” is not part of a Theme file.`),
    ...inputProblems(file.inputs),
  ]
  if (problems.length > 0) {
    return {
      ok: false,
      message: `The Theme can't be imported. ${problems.join(" ")}`,
    }
  }

  const fonts = await getAvailableFonts(payload)
  const inputs = normalizeInputs(file.inputs, FALLBACK_INPUTS)
  const missing: string[] = []
  for (const key of FONT_KEYS) {
    const family = inputs[key]
    const font = fonts.find(
      (candidate) => sameText(candidate.family, family) && servable(candidate)
    )
    if (font) inputs[key] = font.key
    else missing.push(family)
  }
  if (missing.length > 0) {
    const names = [...new Set(missing)].map((family) => `“${family}”`)
    return {
      ok: false,
      message: `This Site doesn't have the ${names.length === 1 ? "font" : "fonts"} ${names.join(" and ")}. Add ${names.length === 1 ? "it" : "them"} under Settings, Assets, then import again.`,
    }
  }

  const base =
    typeof file.name === "string" && file.name.trim()
      ? file.name.trim().slice(0, NAME_MAX - 4)
      : "Imported Theme"
  try {
    const { docs } = await payload.find({
      collection: "saved-themes",
      pagination: false,
      depth: 0,
      select: { name: true },
      ...access,
    })
    const taken = (name: string) =>
      PRESETS.some((preset) => sameText(preset.name, name)) ||
      docs.some((doc) => sameText(doc.name, name))
    let name = base
    for (let n = 2; taken(name); n++) name = `${base} ${n}`
    await payload.create({
      collection: "saved-themes",
      data: { name, inputs },
      ...access,
    })
    return { ok: true, message: `Imported “${name}”. Apply it to use it.` }
  } catch (error) {
    return formStateFromError(error)
  }
}
