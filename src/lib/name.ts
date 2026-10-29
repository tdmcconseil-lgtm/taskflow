// Nom complet affiché à partir du prénom et du nom.
export function composeName(firstName: string, lastName?: string | null): string {
  return [firstName.trim(), (lastName ?? "").trim()].filter(Boolean).join(" ");
}
