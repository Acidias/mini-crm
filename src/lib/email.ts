import nodemailer from "nodemailer";

// SMTP transport for sending emails via Zoho
let _transport: nodemailer.Transporter | null = null;

export function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtppro.zoho.eu",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transport;
}

// The from address is now the authenticated SMTP user
export const FROM_ADDRESS = process.env.SMTP_USER || "mihaly@foundry70.co.uk";
export const FROM_NAME = process.env.SMTP_FROM_NAME || "Mihaly Dani";

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
  const transport = getTransport();
  const result = await transport.sendMail({
    from: from ? `${FROM_NAME} <${from}>` : `${FROM_NAME} <${FROM_ADDRESS}>`,
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
