/**
 * `pnpm --filter property-management-cms sync:demo`: reconciles every Site
 * whose Property Feed account is one of the demo accounts (demo-mountain,
 * demo-beach) from the in-memory demo feed, and prints each report.
 * Uses apps/cms/.env like `next dev`.
 */
import { config as loadEnv } from "dotenv"

loadEnv({ quiet: true })

async function main() {
  // After loading the env: the config reads it on import.
  const { getPayload } = await import("payload")
  const { default: config } = await import("../payload.config")
  const { createFakeFeed, DEMO_FEED_ACCOUNTS, reconcile } =
    await import("./index")

  const payload = await getPayload({ config })
  const feed = createFakeFeed()
  const { docs: sites } = await payload.find({
    collection: "sites",
    where: { feedAccountRef: { in: [...DEMO_FEED_ACCOUNTS] } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { slug: true, feedAccountRef: true },
  })
  if (sites.length === 0) {
    console.log(
      `No Sites with a demo Feed account (${DEMO_FEED_ACCOUNTS.join(", ")}).`
    )
  }
  let failed = false
  for (const site of sites) {
    const report = await reconcile({ payload, feed }, site)
    failed ||= report.errors.length > 0
    console.log(JSON.stringify(report, null, 2))
  }
  return failed ? 1 : 0
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error)
    process.exit(1)
  }
)
