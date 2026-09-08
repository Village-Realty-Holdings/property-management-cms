// Runs after `next build` (see open-next.config.ts `buildCommand`).
//
// Turbopack externalizes `drizzle-kit` (via @payloadcms/next) and `typescript`
// (via Next's default server-external list) under hashed names such as
// `drizzle-kit-<hash>/api`, resolved through symlinks in `.next/node_modules/`.
// Neither package is traced into the OpenNext output (Payload excludes
// drizzle-kit from tracing, and typescript is not traced either), so the
// OpenNext esbuild bundle fails with `Could not resolve "drizzle-kit-<hash>/api"`.
//
// Both packages are only needed to generate migrations and types, never on the
// Worker at runtime. This script creates a throwing stub package for each hashed
// name in the project's node_modules, which esbuild finds while walking up from
// the .open-next output, so the bundle builds and any accidental runtime use
// fails loudly.
import fs from 'node:fs'
import path from 'node:path'

const STUBBED = ['drizzle-kit', 'typescript']
const SUBPATHS = ['index', 'api']

const root = process.cwd()
const nextExternals = path.join(root, '.next', 'node_modules')
if (!fs.existsSync(nextExternals)) process.exit(0)

const stub = (name) => `'use strict'
const fail = (prop) => {
  throw new Error(
    'The "${name}" package is not available in the Cloudflare Worker bundle (accessed "' +
      String(prop) +
      '"). It is only needed at build time to generate migrations and types.',
  )
}
module.exports = new Proxy(
  {},
  {
    get(_, prop) {
      if (typeof prop === 'symbol' || prop === '__esModule' || prop === 'default' || prop === 'then') return undefined
      return fail(prop)
    },
  },
)
`

for (const entry of fs.readdirSync(nextExternals)) {
  const pkg = STUBBED.find((p) => entry.startsWith(`${p}-`))
  if (!pkg) continue
  const dir = path.join(root, 'node_modules', entry)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: entry, version: '0.0.0', main: 'index.js', exports: { '.': './index.js', './api': './api.js' } }, null, 2),
  )
  for (const sub of SUBPATHS) fs.writeFileSync(path.join(dir, `${sub}.js`), stub(pkg))
  console.log(`[stub-turbopack-externals] stubbed ${entry} -> ${pkg}`)
}
