/**
 * Which Section slots each layout shows. Mirrors the `admin.condition` on
 * the slot fields in `src/blocks/Section/config.ts`, which the schema cannot
 * carry (functions do not serialise). Keep the two in step.
 */
export const SECTION_SLOTS: Record<string, string[]> = {
  single: ['main'],
  twoColumns: ['main', 'secondary'],
  mediaLeft: ['main', 'secondary'],
  mediaRight: ['main', 'secondary'],
  threeCards: ['main', 'secondary', 'third'],
}

export const SECTION_SLOT_NAMES = new Set(['main', 'secondary', 'third'])

/** True when the slot is used by the layout, or when the layout is unknown. */
export function slotVisible(slot: string, layout: unknown): boolean {
  if (!SECTION_SLOT_NAMES.has(slot)) return true
  const slots = typeof layout === 'string' ? SECTION_SLOTS[layout] : undefined
  return slots ? slots.includes(slot) : true
}
