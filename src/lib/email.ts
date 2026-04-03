// Email from address - no heavy imports needed for this
export const FROM_ADDRESS = "mihaly.dani@foundry70.co.uk";

export function getFromAddress() {
  return process.env.SMTP_USER || FROM_ADDRESS;
}

export function getFromName() {
  return process.env.SMTP_FROM_NAME || "Mihaly Dani";
}

// SMTP sending - lazy-loads nodemailer only when actually sending
export async function sendSmtpEmail({
  from,
  to,
  subject,
  text,
  html,
}: {
  from?: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ messageId: string }> {
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST || "smtppro.zoho.eu",
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const fromName = getFromName();
  const fromAddr = from || getFromAddress();
  const result = await transport.sendMail({
    from: `${fromName} <${fromAddr}>`,
    to,
    subject,
    text,
    html,
  });
  return { messageId: result.messageId };
}

// IMAP config for checking inbox
export function getImapConfig() {
  return {
    host: process.env.IMAP_HOST || "imappro.zoho.eu",
    port: parseInt(process.env.IMAP_PORT || "993"),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    logger: false as const,
  };
}
