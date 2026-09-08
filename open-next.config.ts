import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

const config = {
  ...defineCloudflareConfig({}),
  // Stub the hashed Turbopack externals (drizzle-kit, typescript) that are not
  // traced into the Worker bundle. See scripts/stub-turbopack-externals.mjs.
  buildCommand: 'npm run build && node scripts/stub-turbopack-externals.mjs',
}

export default config
