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
