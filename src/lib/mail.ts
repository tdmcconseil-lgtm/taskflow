// Transport email.
//  - MAIL_TRANSPORT="console" : les emails sont affichés dans la console du
//    serveur (mock, aucun envoi réel) ;
//  - MAIL_TRANSPORT="smtp"    : envoi via SMTP. En dev, on pointe sur Mailpit
//    (docker-compose) qui capture tout — boîte web sur http://localhost:8026.

import nodemailer, { type Transporter } from "nodemailer";

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
    const from = process.env.MAIL_FROM ?? "Taskflow <no-reply@taskflow.local>";
    await smtpTransport().sendMail({
      from,
      to: mail.to,
      subject: mail.subject,
      text: mail.body,
    });
    return;
  }

  throw new Error(`Transport email non supporté : ${transport}`);
}

export function emailChangeEmail(params: {
  name: string;
  newEmail: string;
  confirmUrl: string;
  expiresAt: Date;
}): { subject: string; body: string } {
  const { name, newEmail, confirmUrl, expiresAt } = params;
  return {
    subject: "Confirmez votre nouvelle adresse email Taskflow",
    body: [
      `Bonjour ${name},`,
      "",
      `Une demande de changement d'adresse email vers « ${newEmail} » a été faite`,
      "sur votre compte Taskflow. Pour la valider, cliquez sur le lien ci-dessous :",
      "",
      confirmUrl,
      "",
      `Ce lien expire le ${expiresAt.toLocaleString("fr-FR")}.`,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email :",
      "votre adresse actuelle reste inchangée.",
      "",
      "— L'équipe Taskflow",
    ].join("\n"),
  };
}

export function invitationEmail(params: {
  inviterName: string;
  workspaceName: string;
  acceptUrl: string;
  expiresAt: Date;
}): { subject: string; body: string } {
  const { inviterName, workspaceName, acceptUrl, expiresAt } = params;
  return {
    subject: `${inviterName} vous invite à rejoindre « ${workspaceName} » sur Taskflow`,
    body: [
      "Bonjour,",
      "",
      `${inviterName} vous invite à collaborer dans l'espace de travail`,
      `« ${workspaceName} » sur Taskflow. Pour créer votre compte et le rejoindre,`,
      "cliquez sur le lien ci-dessous :",
      "",
      acceptUrl,
      "",
      `Ce lien expire le ${expiresAt.toLocaleString("fr-FR")}.`,
      "",
      "Si vous n'êtes pas concerné, ignorez simplement cet email.",
      "",
      "— L'équipe Taskflow",
    ].join("\n"),
  };
}
