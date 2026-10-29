import { hash, verify } from "@node-rs/argon2";

// Hachage argon2id — les mots de passe ne sont jamais stockés en clair.
// Paramètres raisonnables pour un usage web interactif.
const OPTIONS = {
  memoryCost: 19456, // 19 Mio
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export function verifyPassword(
  storedHash: string,
  plain: string,
): Promise<boolean> {
  return verify(storedHash, plain, OPTIONS);
}
