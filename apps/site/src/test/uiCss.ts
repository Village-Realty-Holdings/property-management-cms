import { readFileSync } from "node:fs"
import { join } from "node:path"

import { compile } from "@tailwindcss/node"

const stylesDir = join(
  import.meta.dirname,
  "../../../../packages/ui/src/styles"
)

/** The source of `packages/ui/src/styles/globals.css`. */
export const globalsCss = readFileSync(join(stylesDir, "globals.css"), "utf8")

/**
 * Compiles the shared stylesheet with Tailwind for just these classes, so a
 * test can assert on the CSS a class really produces (the token it reads),
 * not only on the class name.
 */
export async function compileUiCss(classes: string[]): Promise<string> {
  const compiler = await compile(globalsCss, {
    base: stylesDir,
    onDependency() {},
  })
  return compiler.build(classes)
}

/** The declarations of the first `selector { ... }` block in `css`. */
export function declarationsOf(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No ${selector} block in the CSS`)
  const end = css.indexOf("\n}", start)
  return css.slice(start, end)
}

/** Custom properties declared in `:root { ... }` of globals.css, by name. */
export function rootTokens(): Record<string, string> {
  const block = declarationsOf(globalsCss, ":root")
  const tokens: Record<string, string> = {}
  for (const match of block.matchAll(/^\s*(--[\w-]+):\s*(.+?);\s*$/gm)) {
    tokens[match[1]!] = match[2]!
  }
  return tokens
}

/** Every string literal in a source file that looks like a class list. */
export function classLiterals(source: string): string[] {
  return [...source.matchAll(/"([^"\n]*)"|`([^`]*)`/g)]
    .map((m) => m[1] ?? m[2] ?? "")
    .filter((s) => /[a-z]-|^[a-z]/.test(s))
}
