import { randomBytes, createHash } from "node:crypto";

// Jeton d'invitation : une valeur aléatoire est envoyée dans le lien email,
// mais on ne stocke en base que son hash (SHA-256). Impossible de reconstituer
// un lien valide à partir de la base seule.

export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
