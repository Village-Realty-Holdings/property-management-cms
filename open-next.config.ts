import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const cloudflareConfig = defineCloudflareConfig({
	// Uncomment to enable R2 cache,
	// It should be imported as:
	// `import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";`
	// See https://opennext.js.org/cloudflare/caching for more details
	// incrementalCache: r2IncrementalCache,
});

export default {
	...cloudflareConfig,
	// Prevent the adapter from recursively invoking the app's `npm run build`
	// while it is already performing the Next.js build.
	buildCommand: "next build",
};
