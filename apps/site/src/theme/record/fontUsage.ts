import { registerFontUsage, type FontUsageFinder } from "../../fonts/fontUsage"
import { parseFontKey } from "./fontKeys"

/**
 * Locks a Font the live Theme uses as its heading or body font. Only the live
 * Theme counts: an old version in the history that used the Font does not
 * keep it (otherwise a Font once used could never be deleted). Restoring such
 * a version after the Font is gone falls back to the Classic font and says so
 * in the version's summary (see restoreThemeVersion).
 */
export const themeFontUsage: FontUsageFinder = async (
  fontId,
  { payload, req }
) => {
  const theme = await payload.findGlobal({
    slug: "theme",
    depth: 0,
    req,
  })
  const uses = (key: unknown) => {
    const parsed = parseFontKey(key)
    return parsed?.kind === "stored" && parsed.id === fontId
  }
  return [
    ...(uses(theme.headingFont) ? ["Used by the Theme (heading font)"] : []),
    ...(uses(theme.bodyFont) ? ["Used by the Theme (body font)"] : []),
  ]
}

// The config can be built more than once in a process (Next dev reloads,
// tests): keep one registration, replacing the previous.
const REGISTERED = Symbol.for("awayday.site.themeFontUsageUnregister")
type Holder = { [REGISTERED]?: () => void }

/** Registers the Theme's Font-usage finder (idempotent). */
export function registerThemeFontUsage(): void {
  const holder = globalThis as Holder
  holder[REGISTERED]?.()
  holder[REGISTERED] = registerFontUsage(themeFontUsage)
}
