"use client";

import { useState } from "react";
import Link from "next/link";

// Comparateur interactif : getRIDA est TOUJOURS la 1re colonne (figée) ; un
// sélecteur en tête choisit les 2 autres outils affichés côte à côte. Le
// gagnant de chaque critère est marqué clairement (pastille verte « Avantage »).
//
// Les `adv[key]` sont relatifs à getRIDA : "g" = getRIDA l'emporte, "r" = le
// concurrent l'emporte, "eq" = égalité. Pour un critère donné :
//  - une colonne concurrente gagne si son adv vaut "r" ;
//  - getRIDA gagne s'il bat au moins un concurrent affiché et n'en perd aucun.

type Adv = "g" | "r" | "eq";

type AppData = {
  name: string;
  cells: Record<string, string>;
  adv: Record<string, string>;
};

type Row = { key: string; label: string; getrida: string };

export type ComparateurLabels = {
  getrida: string;
  criterion: string;
  selectorLabel: string;
  slot2: string;
  slot3: string;
  winBadge: string;
  winLegend: string;
};

type Props = {
  rows: Row[];
  apps: Record<string, AppData>;
  order: string[];
  labels: ComparateurLabels;
};

function CheckBadge({ label }: { label: string }) {
  return (
    <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-3 w-3">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 10.7a1 1 0 1 1 1.4-1.4l3 3 6.8-6.8a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </span>
  );
}

export function ComparateurTable({ rows, apps, order, labels }: Props) {
  const [rivalA, setRivalA] = useState(order[0]);
  const [rivalB, setRivalB] = useState(order[1]);

  const shown = [rivalA, rivalB];

  return (
    <div>
      {/* Sélecteur en tête : getRIDA est figé, on choisit les 2 autres. */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-end sm:gap-6 dark:border-zinc-800 dark:bg-zinc-900/60">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{labels.selectorLabel}</p>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {labels.slot2}
            <select
              value={rivalA}
              onChange={(e) => setRivalA(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {order.map((slug) => (
                <option key={slug} value={slug} disabled={slug === rivalB}>
                  {apps[slug].name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {labels.slot3}
            <select
              value={rivalB}
              onChange={(e) => setRivalB(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {order.map((slug) => (
                <option key={slug} value={slug} disabled={slug === rivalA}>
                  {apps[slug].name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Tableau 3 colonnes : getRIDA (figé) + les 2 outils choisis. */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-white text-left align-bottom dark:border-zinc-800 dark:bg-zinc-900">
              <th className="w-44 px-4 py-3 font-semibold">{labels.criterion}</th>
              <th className="w-1/3 bg-indigo-50/60 px-4 py-3 font-semibold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                {labels.getrida}
              </th>
              {shown.map((slug) => (
                <th key={slug} className="w-1/3 px-4 py-3 font-semibold">
                  <Link href={`/comparatif/${slug}`} className="underline-offset-2 hover:underline">
                    {apps[slug].name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const advA = (apps[rivalA].adv[row.key] as Adv) ?? "eq";
              const advB = (apps[rivalB].adv[row.key] as Adv) ?? "eq";
              const getridaWins = advA !== "r" && advB !== "r" && (advA === "g" || advB === "g");

              const getridaCls = getridaWins
                ? "bg-emerald-50 dark:bg-emerald-950/30"
                : "bg-indigo-50/40 dark:bg-indigo-950/20";

              const rivalCell = (slug: string, adv: Adv, value: string) => {
                const wins = adv === "r";
                return (
                  <td
                    key={slug}
                    className={`px-4 py-3 text-xs align-top ${
                      wins
                        ? "bg-emerald-50 text-zinc-700 dark:bg-emerald-950/30 dark:text-zinc-200"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {wins && (
                      <div>
                        <CheckBadge label={labels.winBadge} />
                      </div>
                    )}
                    <span>{value}</span>
                  </td>
                );
              };

              return (
                <tr
                  key={row.key}
                  className="border-b border-zinc-200 align-top last:border-0 dark:border-zinc-800"
                >
                  <th scope="row" className="px-4 py-3 text-left font-semibold">
                    {row.label}
                  </th>
                  <td className={`px-4 py-3 text-zinc-700 dark:text-zinc-200 ${getridaCls}`}>
                    {getridaWins && (
                      <div>
                        <CheckBadge label={labels.winBadge} />
                      </div>
                    )}
                    <span>{row.getrida}</span>
                  </td>
                  {rivalCell(rivalA, advA, apps[rivalA].cells[row.key])}
                  {rivalCell(rivalB, advB, apps[rivalB].cells[row.key])}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          {labels.winLegend}
        </span>
      </div>
    </div>
  );
}
