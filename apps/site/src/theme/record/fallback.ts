import type { ThemeInputs } from "../inputs"
import { DEFAULT_INPUTS } from "../presets"

/**
 * What the Site shows until a Theme is saved, and what a new Theme starts
 * from: the default preset, Classic (apps/site ADR-0004). It matches the look
 * the Site had before the Theme existed.
 */
export const FALLBACK_INPUTS: ThemeInputs = DEFAULT_INPUTS
