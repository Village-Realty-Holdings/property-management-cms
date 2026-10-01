/**
 * The requests among `urls` that leave the Site's origin. The Site
 * self-hosts every font (apps/site ADR-0004), so a visitor's browser must
 * only ever talk to the Site itself. `data:` and `blob:` URLs never leave the
 * browser and are ignored; a URL that cannot be parsed is reported.
 */
export function foreignRequests(urls: readonly string[], origin: string) {
  return urls.filter((url) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === "data:" || parsed.protocol === "blob:")
        return false
      return parsed.origin !== new URL(origin).origin
    } catch {
      return true
    }
  })
}
