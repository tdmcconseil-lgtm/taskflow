"use client";

import { useEffect, useState } from "react";

const THEME_COOKIE = "tf_theme";

// Applique le thème immédiatement (classe `dark` + color-scheme) et mémorise le
// choix dans un cookie par appareil, lu ensuite côté serveur au chargement.
function applyTheme(dark: boolean) {
  const e = document.documentElement;
  e.classList.toggle("dark", dark);
  e.style.colorScheme = dark ? "dark" : "light";
  try {
    document.cookie = `${THEME_COOKIE}=${dark ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Cookies indisponibles : le thème reste appliqué pour la session en cours.
  }
}

// Interrupteur de thème (tout en bas du menu). Vert = mode sombre actif.
// `initialDark` vient du cookie lu côté serveur ; s'il est absent (choix encore
// jamais fait), on s'aligne au montage sur ce que le script anti-flash a posé.
export function ThemeToggle({
  label,
  initialDark,
}: {
  label: string;
  initialDark?: boolean;
}) {
  const [dark, setDark] = useState(initialDark ?? false);

  useEffect(() => {
    if (initialDark === undefined) {
      setDark(document.documentElement.classList.contains("dark"));
    }
  }, [initialDark]);

  function toggle() {
    const next = !dark;
    setDark(next);
    applyTheme(next);
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-2 px-2 py-1.5">
      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label={label}
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          dark ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            dark ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
