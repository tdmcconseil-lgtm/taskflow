// Transport email.
//  - MAIL_TRANSPORT="console" : les emails sont affichés dans la console du
//    serveur (mock, aucun envoi réel) ;
//  - MAIL_TRANSPORT="smtp"    : envoi via SMTP. En dev, on pointe sur Mailpit
//    (docker-compose) qui capture tout — boîte web sur http://localhost:8026.

import nodemailer, { type Transporter } from "nodemailer";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import type { Locale } from "@/lib/i18n/config";

const INTL_LOCALE: Record<Locale, string> = { fr: "fr-FR", en: "en-US", es: "es-ES" };

type Mail = {
  to: string;
  subject: string;
  body: string;
  // En-têtes additionnels (ex. List-Unsubscribe pour les notifications).
  headers?: Record<string, string>;
};

let cachedTransport: Transporter | null = null;
function smtpTransport(): Transporter {
  if (cachedTransport) return cachedTransport;
  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number.parseInt(process.env.SMTP_PORT ?? "1026", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    // Mailpit local : pas de TLS ni d'auth. En prod, fournir SMTP_USER/PASS.
    secure: false,
    auth: user && pass ? { user, pass } : undefined,
  });
  return cachedTransport;
}

export async function sendMail(mail: Mail): Promise<void> {
  const transport = process.env.MAIL_TRANSPORT ?? "console";

  if (transport === "console") {
    console.log(
      [
        "",
        "──────────── EMAIL (mock console) ────────────",
        `À      : ${mail.to}`,
        `Sujet  : ${mail.subject}`,
        "",
        mail.body,
        "──────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }

  if (transport === "smtp") {
    const from = process.env.MAIL_FROM ?? "getRIDA <no-reply@taskflow.local>";
    // Redirection de test (préprod) : si MAIL_REDIRECT_TO est défini, tous les
    // mails partent vers cette adresse quel que soit le destinataire réel, qui
    // est rappelé dans le sujet. Non défini en prod → aucun effet.
    const redirectTo = process.env.MAIL_REDIRECT_TO?.trim();
    const to = redirectTo || mail.to;
    const subject = redirectTo ? `[→ ${mail.to}] ${mail.subject}` : mail.subject;
    await smtpTransport().sendMail({
      from,
      to,
      subject,
      text: mail.body,
      ...(mail.headers ? { headers: mail.headers } : {}),
    });
    return;
  }

  throw new Error(`Transport email non supporté : ${transport}`);
}

export function emailChangeEmail(
  params: {
    name: string;
    newEmail: string;
    confirmUrl: string;
    expiresAt: Date;
  },
  t: Dictionary,
  locale: Locale,
): { subject: string; body: string } {
  const expires = params.expiresAt.toLocaleString(INTL_LOCALE[locale]);
  return {
    subject: t.email.changeSubject,
    body: t.email.changeBody
      .replace("{name}", params.name)
      .replace("{newEmail}", params.newEmail)
      .replace("{url}", params.confirmUrl)
      .replace("{expires}", expires),
  };
}

export function passwordResetEmail(
  params: {
    name: string;
    resetUrl: string;
    expiresAt: Date;
  },
  t: Dictionary,
  locale: Locale,
): { subject: string; body: string } {
  const expires = params.expiresAt.toLocaleString(INTL_LOCALE[locale]);
  return {
    subject: t.email.resetSubject,
    body: t.email.resetBody
      .replace("{name}", params.name)
      .replace("{url}", params.resetUrl)
      .replace("{expires}", expires),
  };
}

export function invitationEmail(
  params: {
    inviterName: string;
    workspaceName: string;
    acceptUrl: string;
    expiresAt: Date;
  },
  t: Dictionary,
  locale: Locale,
): { subject: string; body: string } {
  const expires = params.expiresAt.toLocaleString(INTL_LOCALE[locale]);
  return {
    subject: t.email.inviteSubject
      .replace("{inviter}", params.inviterName)
      .replace("{workspace}", params.workspaceName),
    body: t.email.inviteBody
      .replace("{inviter}", params.inviterName)
      .replace("{workspace}", params.workspaceName)
      .replace("{url}", params.acceptUrl)
      .replace("{expires}", expires),
  };
}

// --- Notifications ---------------------------------------------------------
// Gabarits rendus dans la langue du DESTINATAIRE. Chaque mail porte un pied de
// page « gérer mes notifications » et un en-tête List-Unsubscribe pointant vers
// la même page (délivrabilité + désinscription en un clic côté client).

export type NotificationMail = { subject: string; body: string; headers: Record<string, string> };

type InstantParams = {
  name: string; // destinataire
  actor: string; // auteur de l'action
  task: string; // titre de la tâche
  workspace: string;
  url: string; // lien vers la tâche
  manageUrl: string; // lien vers les préférences de notification
};

function unsubscribeHeaders(manageUrl: string): Record<string, string> {
  return { "List-Unsubscribe": `<${manageUrl}>` };
}

function instantMail(
  subjectKey: string,
  bodyKey: string,
  p: InstantParams,
): NotificationMail {
  const subject = subjectKey
    .replace("{actor}", p.actor)
    .replace("{task}", p.task)
    .replace("{workspace}", p.workspace);
  const body =
    bodyKey
      .replace("{name}", p.name)
      .replace("{actor}", p.actor)
      .replace("{task}", p.task)
      .replace("{workspace}", p.workspace)
      .replace("{url}", p.url);
  return { subject, body, headers: unsubscribeHeaders(p.manageUrl) };
}

function appendFooter(mail: NotificationMail, footerTpl: string, manageUrl: string): NotificationMail {
  return { ...mail, body: `${mail.body}\n\n${footerTpl.replace("{manage}", manageUrl)}` };
}

export function notifyMentionEmail(p: InstantParams, t: Dictionary): NotificationMail {
  return appendFooter(
    instantMail(t.email.notifyMentionSubject, t.email.notifyMentionBody, p),
    t.email.notifyFooter,
    p.manageUrl,
  );
}

export function notifyAssignedEmail(p: InstantParams, t: Dictionary): NotificationMail {
  return appendFooter(
    instantMail(t.email.notifyAssignedSubject, t.email.notifyAssignedBody, p),
    t.email.notifyFooter,
    p.manageUrl,
  );
}

export function notifyFollowerAddedEmail(p: InstantParams, t: Dictionary): NotificationMail {
  return appendFooter(
    instantMail(t.email.notifyFollowerSubject, t.email.notifyFollowerBody, p),
    t.email.notifyFooter,
    p.manageUrl,
  );
}

// Gabarit instantané générique (catégorie Discussions / Modifications réglée sur
// « Immédiat »). `detail` = describeActivity déjà traduit, préfixé de l'auteur.
export function notifyUpdateEmail(
  p: InstantParams & { detail: string },
  t: Dictionary,
): NotificationMail {
  const subject = t.email.notifyUpdateSubject.replace("{task}", p.task);
  const body = t.email.notifyUpdateBody
    .replace("{name}", p.name)
    .replace("{actor}", p.actor)
    .replace("{detail}", p.detail)
    .replace("{task}", p.task)
    .replace("{workspace}", p.workspace)
    .replace("{url}", p.url);
  return appendFooter(
    { subject, body, headers: unsubscribeHeaders(p.manageUrl) },
    t.email.notifyFooter,
    p.manageUrl,
  );
}

// Digest : un seul mail listant les nouveautés groupées par tâche. Chaque ligne
// est fournie déjà rendue (nom de l'auteur + describeActivity, traduits).
export function digestEmail(
  params: {
    name: string;
    manageUrl: string;
    groups: { task: string; workspace: string; lines: string[] }[];
  },
  t: Dictionary,
): NotificationMail {
  const blocks = params.groups.map((g) => {
    const header = t.email.digestTaskHeader
      .replace("{task}", g.task)
      .replace("{workspace}", g.workspace);
    return `${header}\n${g.lines.join("\n")}`;
  });
  const body = [
    t.email.digestIntro.replace("{name}", params.name),
    ...blocks,
    t.email.digestFooter.replace("{manage}", params.manageUrl),
  ].join("\n\n");
  return { subject: t.email.digestSubject, body, headers: unsubscribeHeaders(params.manageUrl) };
}
