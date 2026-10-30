import type { Locale } from "@/lib/i18n/config";

// Drapeaux en SVG (rendus identiquement sur tous les systèmes, contrairement aux
// emojis de drapeaux que Windows n'affiche pas). Ratio 3:2, viewBox 30×20.
export function Flag({
  locale,
  className = "h-3.5 w-5",
}: {
  locale: Locale;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 30 20",
    className: `inline-block shrink-0 rounded-[2px] ring-1 ring-black/10 dark:ring-white/15 ${className}`,
    role: "img" as const,
    "aria-hidden": true,
  };

  if (locale === "fr") {
    return (
      <svg {...common}>
        <rect width="30" height="20" fill="#fff" />
        <rect width="10" height="20" fill="#0055A4" />
        <rect x="20" width="10" height="20" fill="#EF4135" />
      </svg>
    );
  }

  if (locale === "es") {
    return (
      <svg {...common}>
        <rect width="30" height="20" fill="#AA151B" />
        <rect y="5" width="30" height="10" fill="#F1BF00" />
      </svg>
    );
  }

  // en → Union Jack (version compacte sans contre-échange, lisible en petit).
  return (
    <svg {...common}>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth="4" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M15,0 V20 M0,10 H30" stroke="#fff" strokeWidth="6" />
      <path d="M15,0 V20 M0,10 H30" stroke="#C8102E" strokeWidth="3.4" />
    </svg>
  );
}
