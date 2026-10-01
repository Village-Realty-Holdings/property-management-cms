/* eslint-disable turbo/no-undeclared-env-vars -- TZ is the machine's time zone, not a turbo task input */

/**
 * Admin times are shown in the machine's time zone, so a test that reads one
 * pins the zone first. Call it at the top of the file, or in a test that wants
 * another zone and `restoreTimeZone` afterwards.
 */

const original = process.env.TZ

export function setTimeZone(zone: string): void {
  process.env.TZ = zone
}

export function restoreTimeZone(): void {
  if (original === undefined) delete process.env.TZ
  else process.env.TZ = original
}
