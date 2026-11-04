import type { InputHTMLAttributes } from "react";

type ToggleSwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  // Libellé accessible, à fournir quand aucun <label> visible n'entoure déjà
  // l'interrupteur.
  label?: string;
};

// Interrupteur coulissant (toggle, style iOS) : une case à cocher NATIVE rendue
// comme un bouton. Remplace <input type="checkbox"> partout — mêmes props
// (name, value, checked/defaultChecked, onChange, disabled) et même comportement
// de formulaire ; seul l'aspect change. Violet quand actif.
// Utilisable depuis un composant serveur comme client (aucun hook interne) ;
// l'input transparent par-dessus la piste porte le clic, le focus et le state.
export function ToggleSwitch({ label, className, ...props }: ToggleSwitchProps) {
  return (
    <span className={`relative inline-flex h-6 w-11 shrink-0 items-center ${className ?? ""}`}>
      <input
        type="checkbox"
        aria-label={label}
        className="peer absolute inset-0 z-10 m-0 cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-zinc-300 transition-colors peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50 dark:bg-zinc-600 dark:peer-checked:bg-indigo-500 dark:peer-focus-visible:ring-offset-zinc-900"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 h-5 w-5 translate-x-0.5 transform rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
      />
    </span>
  );
}
