"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions/superadmin";

type Invoice = {
  id: string;
  period: string; // mois facturé, déjà formaté
  amount: string; // montant, déjà formaté (ex. « 12,00 € »)
  due: string; // échéance, déjà formatée
  overdue: boolean;
};

type Workspace = {
  id: string;
  name: string;
  suspended: boolean;
  suspendedSince: string | null; // date de coupure, déjà formatée
  invoices: Invoice[];
};

type Labels = {
  suspendedSince: string; // « Suspendu le {date} »
  active: string; // « Actif (facture échue) »
  invoicesHeading: string;
  noInvoices: string;
  overdue: string; // « échue »
  due: string; // « échéance {date} »
  markPaid: string;
  markPaidConfirm: string;
  reopenHeading: string;
  reasonPlaceholder: string;
  reopenSubmit: string;
  reopenConfirm: string;
};

function PaidButton({ label, confirm }: { label: string; confirm: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
      className="rounded-lg border border-green-600 px-3 py-1 text-sm font-medium text-green-700 transition hover:bg-green-50 disabled:opacity-60 dark:text-green-400 dark:hover:bg-green-950"
    >
      {label}
    </button>
  );
}

function ReopenButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-60"
    >
      {label}
    </button>
  );
}

// Carte de recouvrement d'un espace (console superadmin) : en-tête (nom, état de
// coupure), factures impayées avec « Marquer payé » par facture, et — pour un
// espace suspendu — le bloc « Rouvrir sans paiement » avec motif obligatoire.
export function RecoveryCard({
  workspace,
  markPaid,
  reopen,
  labels,
}: {
  workspace: Workspace;
  markPaid: (formData: FormData) => Promise<void>;
  reopen: (prev: FormState, formData: FormData) => Promise<FormState>;
  labels: Labels;
}) {
  const [state, formAction] = useActionState(reopen, undefined);

  return (
    <li className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <h2 className="min-w-0 flex-1 font-medium">{workspace.name}</h2>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
            workspace.suspended
              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          {workspace.suspended
            ? labels.suspendedSince.replace("{date}", workspace.suspendedSince ?? "")
            : labels.active}
        </span>
      </div>

      {/* Factures impayées */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {labels.invoicesHeading}
        </p>
        {workspace.invoices.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">{labels.noInvoices}</p>
        ) : (
          <ul className="space-y-2">
            {workspace.invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50"
              >
                <div className="min-w-0 text-sm">
                  <span className="font-medium">{inv.period}</span>
                  <span className="ml-2 tabular-nums">{inv.amount}</span>
                  <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                    {labels.due.replace("{date}", inv.due)}
                  </span>
                  {inv.overdue && (
                    <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      {labels.overdue}
                    </span>
                  )}
                </div>
                <form action={markPaid} className="shrink-0">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <PaidButton label={labels.markPaid} confirm={labels.markPaidConfirm} />
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Réouverture sans paiement (geste commercial) — seulement si suspendu. */}
      {workspace.suspended && (
        <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {labels.reopenHeading}
          </p>
          <form
            action={formAction}
            onSubmit={(e) => {
              if (!window.confirm(labels.reopenConfirm)) e.preventDefault();
            }}
            className="space-y-2"
          >
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <textarea
              name="reason"
              rows={2}
              required
              placeholder={labels.reasonPlaceholder}
              className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
            <div className="flex justify-end">
              <ReopenButton label={labels.reopenSubmit} />
            </div>
          </form>
        </div>
      )}
    </li>
  );
}
