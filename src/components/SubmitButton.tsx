"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  // Désactivation applicative (en plus de l'état « en cours » du formulaire).
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      data-primary-action=""
      disabled={pending || disabled}
      className={`inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-950 ${className}`}
    >
      {pending ? "…" : children}
    </button>
  );
}
