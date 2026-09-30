import { siteThemeCss, type SiteTheme } from "./themeStyle"

/**
 * The Theme's stylesheet as one <style> element for the root layout: the
 * variables at `:root`, the `@font-face` rules for the fonts in use and the
 * reduced-motion override (see `siteThemeCss`). At `:root`, not on the Site's
 * wrapper, so dialogs and sheets portalled out of it are themed too.
 *
 * The CSS is set as raw HTML: React would escape the quotes in font names and
 * URLs, which breaks the rules. `siteThemeCss` strips anything that could end
 * the element.
 */
export function SiteThemeStyle({ theme }: { theme: SiteTheme | null }) {
  return (
    <style
      id="site-theme"
      dangerouslySetInnerHTML={{ __html: siteThemeCss(theme) }}
    />
  )
}
