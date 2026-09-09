import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

const config = {
  ...defineCloudflareConfig({}),
  // Stub the hashed Turbopack externals (drizzle-kit, typescript) that are not
  // traced into the Worker bundle. See scripts/stub-turbopack-externals.mjs.
  // `npm run build` is the OpenNext build itself (Workers Builds runs it), so
  // the Next step is `build:next`; its `postbuild:next` writes the sitemap
  // into `public/` before OpenNext copies it into the assets directory.
  buildCommand: 'npm run build:next && node scripts/stub-turbopack-externals.mjs',
}

export default config
