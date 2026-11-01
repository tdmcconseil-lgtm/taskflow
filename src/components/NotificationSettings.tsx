"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { labelClass, errorClass } from "@/components/ui";
import { useT } from "@/lib/i18n/context";
import {
  updateNotificationPreferences,
  type NotifFormState,
} from "@/lib/actions/notifications";
import type { EffectivePreference, NotifCategory } from "@/lib/notify";

const CATEGORIES: NotifCategory[] = [
  "mentions",
  "assignments",
  "discussions",
  "taskChanges",
  "dueReminders",
];

const selectClass =
  "rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function NotificationSettings({ pref }: { pref: EffectivePreference }) {
  const t = useT();
  const [state, action] = useActionState<NotifFormState, FormData>(
    updateNotificationPreferences,
    undefined,
  );
  const n = t.notifications;

  const channelLabel: Record<string, string> = {
    INSTANT: n.channelInstant,
    DIGEST: n.channelDigest,
    OFF: n.channelOff,
  };

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{n.intro}</p>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="emailEnabled"
          defaultChecked={pref.emailEnabled}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
        />
        {n.emailEnabled}
      </label>

      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{n.categories[cat].label}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{n.categories[cat].hint}</p>
            </div>
            <select name={cat} defaultValue={pref[cat]} className={selectClass}>
              <option value="INSTANT">{channelLabel.INSTANT}</option>
              <option value="DIGEST">{channelLabel.DIGEST}</option>
              <option value="OFF">{channelLabel.OFF}</option>
            </select>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="min-w-0">
          <label htmlFor="digestFrequency" className={labelClass}>
            {n.digestCadence}
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{n.digestCadenceHint}</p>
        </div>
        <select
          id="digestFrequency"
          name="digestFrequency"
          defaultValue={pref.digestFrequency}
          className={selectClass}
        >
          <option value="DAILY">{n.digestDaily}</option>
          <option value="HOURLY">{n.digestHourly}</option>
        </select>
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}
      <SubmitButton>{t.profileForms.save}</SubmitButton>
    </form>
  );
}
