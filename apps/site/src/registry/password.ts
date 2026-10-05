/**
 * Password hashing for the Registry's Users (apps/site ADR-0015). PBKDF2 with
 * SHA-256 through WebCrypto, so it runs the same on Node and on Workers,
 * where Payload's own password hashing doesn't (apps/cms ADR-0015). 100,000
 * iterations is the most Workers allows.
 *
 * Stored as `pbkdf2-sha256$<iterations>$<salt>$<hash>`, salt and hash in
 * base64url, so the iteration count can rise later without breaking old
 * hashes.
 */

const ALGORITHM = "pbkdf2-sha256"
const ITERATIONS = 100_000
const SALT_BYTES = 16
const HASH_BITS = 256

/** The shortest password the Registry accepts. */
export const MIN_PASSWORD_LENGTH = 12
/** Longer passwords only cost hashing time. */
export const MAX_PASSWORD_LENGTH = 256

/** Why a password can't be used, or null when it can. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Use at most ${MAX_PASSWORD_LENGTH} characters.`
  }
  return null
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(password, salt, ITERATIONS)
  return [ALGORITHM, ITERATIONS, encode(salt), encode(hash)].join("$")
}

/** Whether the password matches the stored hash. A malformed hash never does. */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [algorithm, iterations, salt, hash] = stored.split("$")
  const rounds = Number(iterations)
  if (
    algorithm !== ALGORITHM ||
    !Number.isInteger(rounds) ||
    rounds < 1 ||
    rounds > ITERATIONS ||
    !salt ||
    !hash
  ) {
    return false
  }
  const expected = decode(hash)
  const actual = await derive(password, decode(salt), rounds)
  return sameBytes(actual, expected)
}

/**
 * Spends as long as a real check, for an email with no password, so the
 * response time doesn't tell an attacker which emails have accounts.
 */
export async function verifyNothing(password: string): Promise<false> {
  await derive(password, new Uint8Array(SALT_BYTES), ITERATIONS)
  return false
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  )
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    HASH_BITS
  )
  return new Uint8Array(bits)
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

const encode = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url")

const decode = (text: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array(Buffer.from(text, "base64url"))
