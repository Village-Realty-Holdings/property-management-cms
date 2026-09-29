import path from "node:path"

// Each workspace has its own eslint.config.js, so run ESLint from inside the
// workspace that owns the staged files.
const workspaces = ["apps/cms", "apps/site", "packages/content", "packages/ui"]

const eslint = (files) =>
  workspaces.flatMap((workspace) => {
    const dir = path.resolve(workspace) + path.sep
    const owned = files.filter((file) => file.startsWith(dir))
    if (owned.length === 0) return []
    const args = owned.map((file) => JSON.stringify(file)).join(" ")
    return [`pnpm -C ${workspace} exec eslint --fix ${args}`]
  })

export default {
  "*.{js,jsx,mjs,cjs,ts,tsx}": eslint,
  "*": "prettier --write --ignore-unknown",
}
