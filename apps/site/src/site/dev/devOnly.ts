import { notFound } from "next/navigation"

/**
 * Answers 404 in production: for the dev-only routes (/dev/blocks), like
 * /dev/theme-sample. Passed the environment like the other dev-only
 * switches (auth/devSignIn).
 */
export function devOnly(
  env: Record<string, string | undefined> = process.env
): void {
  if (env.NODE_ENV === "production") notFound()
}
