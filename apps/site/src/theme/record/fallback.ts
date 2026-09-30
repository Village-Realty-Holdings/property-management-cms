import type { ThemeInputs } from "../inputs"
import { CLASSIC } from "../presets"

/**
 * What the Site shows until a Theme is saved, and what a new Theme starts
 * from: the Classic preset (apps/site ADR-0004). It matches the look the Site
 * had before the Theme existed.
 */
export const FALLBACK_INPUTS: ThemeInputs = CLASSIC.inputs
