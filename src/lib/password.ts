import { randomBytes, scryptSync, timingSafeEqual } from "crypto"
const HASH_PREFIX = "scrypt$"
const KEY_LENGTH = 64
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 }

export function isHashedPassword(value: string): boolean {
  return value.startsWith(HASH_PREFIX)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS)
  return `${HASH_PREFIX}${salt.toString("base64")}$${derived.toString("base64")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false
  if (!isHashedPassword(stored)) {
    return stored === password
  }

  const [, saltBase64, hashBase64] = stored.split("$")
  if (!saltBase64 || !hashBase64) return false
  const salt = Buffer.from(saltBase64, "base64")
  const expected = Buffer.from(hashBase64, "base64")
  const derived = scryptSync(password, salt, expected.length, SCRYPT_OPTIONS)
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}
