/**
 * Site helpers. The Site's colours and fonts come from the Theme (src/theme),
 * not from here.
 */

/** `tel:` href from a displayed phone number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`
}
