import Link from "next/link";
import type { ComponentProps } from "react";

// Boutons de l'application : trois variantes (primaire indigo, secondaire bordé,
// danger rouge) et deux tailles. `buttonClass` reste exporté pour les cas où l'on
// ne peut pas utiliser les composants (ex. balise <a> native, bouton d'un form
// client avec logique propre). `extra` ajoute des utilitaires ponctuels
// (ex. `w-full`, `shrink-0`) sans casser la cohérence des variantes.

type Variant = "primary" | "secondary" | "danger";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-60";

const SIZES: Record<Size, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-indigo-600 font-medium text-white hover:bg-indigo-500",
  secondary:
    "border border-zinc-300 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800",
  danger:
    "border border-red-300 font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${extra}`.trim();
}

type SharedProps = { variant?: Variant; size?: Size; className?: string };

export function Button({
  variant,
  size,
  className = "",
  ...props
}: Omit<ComponentProps<"button">, "className"> & SharedProps) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className = "",
  ...props
}: Omit<ComponentProps<typeof Link>, "className"> & SharedProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
