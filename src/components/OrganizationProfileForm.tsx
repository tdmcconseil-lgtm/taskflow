"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { updateOrganizationProfile, type AdminFormState } from "@/lib/actions/admin";
import { useT } from "@/lib/i18n/context";

type Profile = {
  legalName: string;
  siret: string | null;
  vatNumber: string | null;
  addressLine1: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  contactEmail: string | null;
  phone: string | null;
} | null;

// Volet Identité : informations d'entreprise de l'espace (champs texte).
export function OrganizationProfileForm({
  workspaceId,
  profile,
}: {
  workspaceId: string;
  profile: Profile;
}) {
  const t = useT();
  const [state, formAction] = useActionState<AdminFormState, FormData>(
    updateOrganizationProfile,
    undefined,
  );

  const optional = <span className="text-zinc-400 dark:text-zinc-500">{t.identity.optional}</span>;

  return (
    <form action={formAction} className="space-y-5">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.identity.desc}</p>
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="space-y-1">
        <label htmlFor="legalName" className={labelClass}>
          {t.identity.legalName}
        </label>
        <input
          id="legalName"
          name="legalName"
          required
          defaultValue={profile?.legalName ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="siret" className={labelClass}>
            {t.identity.siret} {optional}
          </label>
          <input
            id="siret"
            name="siret"
            inputMode="numeric"
            placeholder="14 chiffres"
            defaultValue={profile?.siret ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="vatNumber" className={labelClass}>
            {t.identity.vatNumber} {optional}
          </label>
          <input
            id="vatNumber"
            name="vatNumber"
            defaultValue={profile?.vatNumber ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="addressLine1" className={labelClass}>
          {t.identity.addressLine1} {optional}
        </label>
        <input
          id="addressLine1"
          name="addressLine1"
          defaultValue={profile?.addressLine1 ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="postalCode" className={labelClass}>
            {t.identity.postalCode} {optional}
          </label>
          <input
            id="postalCode"
            name="postalCode"
            defaultValue={profile?.postalCode ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="city" className={labelClass}>
            {t.identity.city} {optional}
          </label>
          <input id="city" name="city" defaultValue={profile?.city ?? ""} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="country" className={labelClass}>
            {t.identity.country}
          </label>
          <input
            id="country"
            name="country"
            defaultValue={profile?.country ?? "France"}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="contactEmail" className={labelClass}>
            {t.identity.contactEmail} {optional}
          </label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={profile?.contactEmail ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="phone" className={labelClass}>
            {t.identity.phone} {optional}
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={profile?.phone ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}
      {state?.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {t.identity.saved}
        </p>
      )}

      <SubmitButton>{t.identity.save}</SubmitButton>
    </form>
  );
}
